import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  authenticateWorker,
  createVisitRecord,
  deleteVisitRecord,
  getDb,
  listVisits,
  listWorkers,
  registerWorker,
  updateVisitStatus,
} from './server/db';
import {
  extractStructuredVisit,
  generateDistrictPolicyBrief,
  synthesizeCarePlanAudio,
  transcribeAudioRecording,
} from './server/gemini';
import { KARNATAKA_NFHS5_DATA } from './src/data/karnatakaNfhs5';
import type { FollowUpStatus, LanguageCode, VisitCategory, WorkerRole } from './src/types/health';

async function startServer() {
  const app = express();
  const db = getDb();

  app.use(express.json({ limit: '15mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'AshaSakhi-AI' });
  });

  // Worker directory & auth
  app.get('/api/auth/workers', (_req, res) => {
    const workers = listWorkers(db);
    res.json({ workers });
  });

  app.post('/api/auth/login', (req, res) => {
    const { phone, password } = req.body as { phone?: string; password?: string };
    if (!phone || !password) {
      res.status(400).json({ error: 'Phone number and password are required.' });
      return;
    }
    const worker = authenticateWorker(db, phone, password);
    if (!worker) {
      res.status(401).json({ error: 'Invalid phone number or password.' });
      return;
    }
    res.json({ worker });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, role, phone, phcName, taluk, district, password } = req.body as {
      name?: string;
      role?: WorkerRole;
      phone?: string;
      phcName?: string;
      taluk?: string;
      district?: string;
      password?: string;
    };

    if (!name?.trim() || !phone?.trim() || !password || password.length < 4) {
      res.status(400).json({ error: 'Name, phone number, and password (min 4 chars) are required.' });
      return;
    }

    try {
      const worker = registerWorker(db, {
        name,
        role: role === 'Taluk Health Officer' ? 'Taluk Health Officer' : 'ASHA Worker',
        phone,
        phcName: phcName || 'Primary Health Centre',
        taluk: taluk || 'Doddaballapura',
        district: district || 'Bengaluru Rural',
        password,
      });
      res.status(201).json({ worker });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not register worker';
      if (message.includes('UNIQUE')) {
        res.status(409).json({ error: 'A worker with that phone number already exists.' });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  // Visits CRUD
  app.get('/api/visits', (_req, res) => {
    const visits = listVisits(db);
    res.json({ visits });
  });

  app.post('/api/visits', (req, res) => {
    const body = req.body as {
      workerId?: number;
      patientName?: string;
      patientAge?: number | string;
      village?: string;
      phcName?: string;
      district?: string;
      category?: VisitCategory;
      gestationalWeeks?: number | string | null;
      bpSystolic?: number | string | null;
      bpDiastolic?: number | string | null;
      hemoglobin?: number | string | null;
      weightKg?: number | string | null;
      symptoms?: string;
      counselingGiven?: string;
      ifaTabletsGiven?: number | string;
      immunizationStatus?: string;
      rawTranscript?: string;
      language?: LanguageCode;
      visitDate?: string;
    };

    if (!body.patientName?.trim() || !body.village?.trim()) {
      res.status(400).json({ error: 'Patient name and village are required.' });
      return;
    }

    const parsedAge = Number(body.patientAge);
    if (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 110) {
      res.status(400).json({ error: 'Please enter a valid patient age (0–110).' });
      return;
    }

    const toNullableNum = (val: number | string | null | undefined): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    };

    const allowedCategories: VisitCategory[] = ['ANC', 'PNC', 'Child Care', 'Nutrition'];
    const category: VisitCategory = allowedCategories.includes(body.category as VisitCategory)
      ? (body.category as VisitCategory)
      : 'ANC';

    const workerId = Number(body.workerId) || 1;

    const visit = createVisitRecord(db, workerId, {
      patientName: body.patientName,
      patientAge: Math.round(parsedAge),
      village: body.village,
      phcName: body.phcName,
      district: body.district,
      category,
      gestationalWeeks: toNullableNum(body.gestationalWeeks),
      bpSystolic: toNullableNum(body.bpSystolic),
      bpDiastolic: toNullableNum(body.bpDiastolic),
      hemoglobin: toNullableNum(body.hemoglobin),
      weightKg: toNullableNum(body.weightKg),
      symptoms: body.symptoms ?? '',
      counselingGiven: body.counselingGiven ?? '',
      ifaTabletsGiven: Number(body.ifaTabletsGiven) || 0,
      immunizationStatus: body.immunizationStatus ?? '',
      rawTranscript: body.rawTranscript ?? '',
      language: body.language || 'en',
      visitDate: body.visitDate,
    });

    res.status(201).json({ visit });
  });

  app.patch('/api/visits/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid visit ID.' });
      return;
    }

    const { followUpStatus, counselingGiven } = req.body as {
      followUpStatus?: FollowUpStatus;
      counselingGiven?: string;
    };

    const allowedStatuses: FollowUpStatus[] = ['pending', 'completed', 'referred'];
    if (followUpStatus && !allowedStatuses.includes(followUpStatus)) {
      res.status(400).json({ error: 'Invalid follow-up status.' });
      return;
    }

    const updated = updateVisitStatus(db, id, { followUpStatus, counselingGiven });
    if (!updated) {
      res.status(404).json({ error: 'Visit record not found.' });
      return;
    }
    res.json({ visit: updated });
  });

  app.delete('/api/visits/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid visit ID.' });
      return;
    }
    const deleted = deleteVisitRecord(db, id);
    if (!deleted) {
      res.status(404).json({ error: 'Visit record not found.' });
      return;
    }
    res.json({ deleted: true });
  });

  // Gemini AI endpoints
  app.post('/api/extract-visit', async (req, res) => {
    try {
      const { transcript, audioBase64, mimeType, languageHint } = req.body as {
        transcript?: string;
        audioBase64?: string;
        mimeType?: string;
        languageHint?: LanguageCode;
      };

      let workingTranscript = (transcript ?? '').trim();
      if (!workingTranscript && audioBase64) {
        workingTranscript = await transcribeAudioRecording(audioBase64, mimeType || 'audio/webm');
      }

      if (!workingTranscript) {
        res.status(400).json({ error: 'Please provide a spoken audio recording or text field note.' });
        return;
      }

      const draft = await extractStructuredVisit(workingTranscript, languageHint || 'kn');
      res.json({ transcript: workingTranscript, draft });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract visit note';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/nfhs/brief', async (req, res) => {
    try {
      const { districtId, question } = req.body as { districtId?: string; question?: string };
      const district =
        KARNATAKA_NFHS5_DATA.find((d) => d.id === districtId) ||
        KARNATAKA_NFHS5_DATA.find((d) => d.id === 'yadgir')!;
      const stateBaseline = KARNATAKA_NFHS5_DATA.find((d) => d.isStateAverage)!;

      const brief = await generateDistrictPolicyBrief({ district, stateBaseline, question });
      res.json({ brief, district: district.district });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate NFHS-5 brief';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const { text } = req.body as { text?: string };
      if (!text?.trim()) {
        res.status(400).json({ error: 'Text is required for speech synthesis.' });
        return;
      }
      const audioBase64 = await synthesizeCarePlanAudio(text.trim());
      res.json({ audioBase64, mimeType: 'audio/wav' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to synthesize audio';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  // Frontend Vite middleware in dev, static dist in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AshaSakhi-AI server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AshaSakhi-AI server:', err);
  process.exit(1);
});

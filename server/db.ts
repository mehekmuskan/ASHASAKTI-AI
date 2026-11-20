import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import type {
  FollowUpStatus,
  LanguageCode,
  RiskLevel,
  VisitCategory,
  VisitInput,
  VisitRecord,
  WorkerProfile,
  WorkerRole,
} from '../src/types/health';
import { assessClinicalRisk, computeNextVisitDate } from '../src/utils/clinicalTriage';

const DB_PATH = path.resolve(process.cwd(), 'ashasakhi.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  seedIfEmpty(db);
  dbInstance = db;
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      phc_name TEXT NOT NULL,
      taluk TEXT NOT NULL,
      district TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      patient_age INTEGER NOT NULL,
      village TEXT NOT NULL,
      phc_name TEXT NOT NULL,
      district TEXT NOT NULL,
      category TEXT NOT NULL,
      gestational_weeks INTEGER,
      bp_systolic INTEGER,
      bp_diastolic INTEGER,
      hemoglobin REAL,
      weight_kg REAL,
      symptoms TEXT NOT NULL DEFAULT '',
      counseling_given TEXT NOT NULL DEFAULT '',
      ifa_tablets_given INTEGER NOT NULL DEFAULT 0,
      immunization_status TEXT NOT NULL DEFAULT '',
      raw_transcript TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'en',
      risk_level TEXT NOT NULL,
      risk_reasons TEXT NOT NULL DEFAULT '[]',
      recommended_action TEXT NOT NULL DEFAULT '',
      followup_status TEXT NOT NULL DEFAULT 'pending',
      visit_date TEXT NOT NULL,
      next_visit_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (worker_id) REFERENCES workers(id)
    );
  `);
}

function seedIfEmpty(db: Database.Database): void {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM workers').get() as { count: number };
  if (countRow.count > 0) return;

  const defaultAvatar = '/src/assets/images/avatar_asha_worker_1795142762159.jpg';
  const ashaHash = bcrypt.hashSync('asha2026', 10);
  const officerHash = bcrypt.hashSync('tho2026', 10);

  const insertWorker = db.prepare(`
    INSERT INTO workers (name, role, phone, phc_name, taluk, district, password_hash, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const w1 = insertWorker.run(
    'Kavitha Gowda',
    'ASHA Worker',
    '9845011223',
    'Doddaballapura PHC',
    'Doddaballapura',
    'Bengaluru Rural',
    ashaHash,
    defaultAvatar
  );

  const w2 = insertWorker.run(
    'Dr. Ramesh Kulkarni',
    'Taluk Health Officer',
    '9845099887',
    'Shahapur Taluk Hospital',
    'Shahapur',
    'Yadgir',
    officerHash,
    defaultAvatar
  );

  const w1Id = Number(w1.lastInsertRowid);
  const w2Id = Number(w2.lastInsertRowid);

  const seedVisits: Array<
    VisitInput & {
      workerId: number;
      followUpStatus: FollowUpStatus;
    }
  > = [
    {
      workerId: w1Id,
      patientName: 'Lakshmi Devi',
      patientAge: 26,
      village: 'Hosahalli',
      phcName: 'Doddaballapura PHC',
      district: 'Bengaluru Rural',
      category: 'ANC',
      gestationalWeeks: 30,
      bpSystolic: 146,
      bpDiastolic: 94,
      hemoglobin: 8.8,
      weightKg: 53.5,
      symptoms: 'Pedal edema and persistent headache',
      counselingGiven: 'Urgent PHC referral arranged; low-salt diet and left-lateral rest advised.',
      ifaTabletsGiven: 30,
      immunizationStatus: 'TT-2 Completed',
      rawTranscript:
        'ಲಕ್ಷ್ಮಿ ದೇವಿ, 26 ವರ್ಷ, ಹೊಸಹಳ್ಳಿ, 7 ತಿಂಗಳ ಗರ್ಭಿಣಿ, BP 146/94 ಇದೆ, Hb 8.8, ಕಾಲು ಊತ ಮತ್ತು ತಲೆನೋವು ಇದೆ, IFA ಮಾತ್ರೆ ಕೊಟ್ಟಿದ್ದೇನೆ.',
      language: 'kn',
      visitDate: '2026-11-18',
      followUpStatus: 'pending',
    },
    {
      workerId: w2Id,
      patientName: 'Mallamma Patil',
      patientAge: 22,
      village: 'Bheemarayanagudi',
      phcName: 'Shahapur CHC',
      district: 'Yadgir',
      category: 'ANC',
      gestationalWeeks: 24,
      bpSystolic: 116,
      bpDiastolic: 74,
      hemoglobin: 6.7,
      weightKg: 41.2,
      symptoms: 'Severe fatigue and breathlessness on walking',
      counselingGiven: 'Referred for IV Iron Sucrose infusion at Shahapur CHC; nutrition counseling.',
      ifaTabletsGiven: 30,
      immunizationStatus: 'TT-1 Completed',
      rawTranscript:
        'Mallamma Patil age 22 from Bheemarayanagudi, 6 months pregnant, Hb is 6.7 g/dL, weight 41.2 kg, feeling dizzy and breathless.',
      language: 'en',
      visitDate: '2026-11-18',
      followUpStatus: 'referred',
    },
    {
      workerId: w1Id,
      patientName: 'Rekha Bai',
      patientAge: 28,
      village: 'Tubagere',
      phcName: 'Doddaballapura PHC',
      district: 'Bengaluru Rural',
      category: 'PNC',
      gestationalWeeks: null,
      bpSystolic: 122,
      bpDiastolic: 80,
      hemoglobin: 9.6,
      weightKg: 49.0,
      symptoms: 'Mild post-delivery weakness',
      counselingGiven: 'Exclusive breastfeeding checked; warm iron-rich meals and 30 IFA tablets given.',
      ifaTabletsGiven: 30,
      immunizationStatus: 'BCG + OPV-0 Birth Dose Done',
      rawTranscript:
        'रेखा बाई, 28 साल, प्रसव के बाद 10वां दिन, Hb 9.6, हल्की कमजोरी है, स्तनपान ठीक चल रहा है, 30 आयरन की गोली दी।',
      language: 'hi',
      visitDate: '2026-11-17',
      followUpStatus: 'pending',
    },
    {
      workerId: w1Id,
      patientName: 'Anitha Kumari',
      patientAge: 24,
      village: 'Madhure',
      phcName: 'Doddaballapura PHC',
      district: 'Bengaluru Rural',
      category: 'Child Care',
      gestationalWeeks: null,
      bpSystolic: null,
      bpDiastolic: null,
      hemoglobin: null,
      weightKg: 8.2,
      symptoms: 'Active and feeding well',
      counselingGiven: 'Completed Pentavalent-3 and IPV-2 at Anganwadi session; complementary feeding reviewed.',
      ifaTabletsGiven: 0,
      immunizationStatus: 'Penta-3 + IPV-2 Completed',
      rawTranscript:
        'ಅನಿತಾ ಕುಮಾರಿ ಅವರ ಮಗು, 9 ತಿಂಗಳು, ತೂಕ 8.2 ಕೆಜಿ, ಪೆಂಟಾ-3 ಲಸಿಕೆ ಆಗಿದೆ, ಆರೋಗ್ಯ ಚೆನ್ನಾಗಿದೆ.',
      language: 'kn',
      visitDate: '2026-11-16',
      followUpStatus: 'completed',
    },
    {
      workerId: w2Id,
      patientName: 'Shantamma K',
      patientAge: 18,
      village: 'Gogi',
      phcName: 'Shahapur CHC',
      district: 'Yadgir',
      category: 'ANC',
      gestationalWeeks: 20,
      bpSystolic: 132,
      bpDiastolic: 86,
      hemoglobin: 9.1,
      weightKg: 43.0,
      symptoms: 'Mild dizziness and reduced appetite',
      counselingGiven: 'High-risk adolescent pregnancy flagged for Medical Officer ANC clinic; IFA & Calcium started.',
      ifaTabletsGiven: 30,
      immunizationStatus: 'TT-1 Completed',
      rawTranscript:
        'Shantamma, 18 years, Gogi village, 5 months pregnant, BP 132/86, Hb 9.1, low appetite.',
      language: 'en',
      visitDate: '2026-11-15',
      followUpStatus: 'pending',
    },
    {
      workerId: w2Id,
      patientName: 'Aarav (c/o Sunita)',
      patientAge: 1,
      village: 'Wadgera',
      phcName: 'Wadgera PHC',
      district: 'Yadgir',
      category: 'Nutrition',
      gestationalWeeks: null,
      bpSystolic: null,
      bpDiastolic: null,
      hemoglobin: 9.3,
      weightKg: 6.9,
      symptoms: 'Poor appetite and recurrent diarrhea episode',
      counselingGiven: 'ORS + Zinc 14-day course initiated; referred to Anganwadi Take-Home Ration & NRC screening.',
      ifaTabletsGiven: 0,
      immunizationStatus: 'MR-1 Scheduled',
      rawTranscript:
        'सुनीता का बच्चा आरव, उम्र 14 महीने, वजन 6.9 किलो, दस्त और भूख कम है, ORS और जिंक दिया।',
      language: 'hi',
      visitDate: '2026-11-14',
      followUpStatus: 'pending',
    },
    {
      workerId: w1Id,
      patientName: 'Manjula R',
      patientAge: 27,
      village: 'Sasalu',
      phcName: 'Doddaballapura PHC',
      district: 'Bengaluru Rural',
      category: 'ANC',
      gestationalWeeks: 16,
      bpSystolic: 114,
      bpDiastolic: 74,
      hemoglobin: 11.4,
      weightKg: 54.0,
      symptoms: 'None',
      counselingGiven: 'Routine 2nd trimester ANC check normal; 30 IFA and calcium tablets supplied.',
      ifaTabletsGiven: 30,
      immunizationStatus: 'TT-1 Completed',
      rawTranscript:
        'ಮಂಜುಳಾ ಆರ್, 27 ವರ್ಷ, ಸಾಸಲು, 4 ತಿಂಗಳ ಗರ್ಭಿಣಿ, BP 114/74, Hb 11.4, ಯಾವುದೇ ತೊಂದರೆ ಇಲ್ಲ.',
      language: 'kn',
      visitDate: '2026-11-12',
      followUpStatus: 'completed',
    },
    {
      workerId: w1Id,
      patientName: 'Lakshmi Devi',
      patientAge: 26,
      village: 'Hosahalli',
      phcName: 'Doddaballapura PHC',
      district: 'Bengaluru Rural',
      category: 'ANC',
      gestationalWeeks: 26,
      bpSystolic: 128,
      bpDiastolic: 82,
      hemoglobin: 9.4,
      weightKg: 52.0,
      symptoms: 'Mild fatigue',
      counselingGiven: 'Reinforced twice-daily IFA adherence and weekly BP check.',
      ifaTabletsGiven: 30,
      immunizationStatus: 'TT-1 Completed',
      rawTranscript:
        'ಲಕ್ಷ್ಮಿ ದೇವಿ, 26 ವರ್ಷ, ಹೊಸಹಳ್ಳಿ, 6 ತಿಂಗಳ ಗರ್ಭಿಣಿ, BP 128/82, Hb 9.4, ಸ್ವಲ್ಪ ಸುಸ್ತು ಇದೆ.',
      language: 'kn',
      visitDate: '2026-10-21',
      followUpStatus: 'completed',
    },
  ];

  for (const item of seedVisits) {
    createVisitRecord(db, item.workerId, item, item.followUpStatus);
  }
}

export function listWorkers(db: Database.Database): WorkerProfile[] {
  const rows = db
    .prepare(
      'SELECT id, name, role, phone, phc_name, taluk, district, avatar_url FROM workers ORDER BY id ASC'
    )
    .all() as Array<{
    id: number;
    name: string;
    role: WorkerRole;
    phone: string;
    phc_name: string;
    taluk: string;
    district: string;
    avatar_url: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    phone: r.phone,
    phcName: r.phc_name,
    taluk: r.taluk,
    district: r.district,
    avatarUrl: r.avatar_url,
  }));
}

export function authenticateWorker(
  db: Database.Database,
  phone: string,
  password: string
): WorkerProfile | null {
  const row = db
    .prepare(
      'SELECT id, name, role, phone, phc_name, taluk, district, password_hash, avatar_url FROM workers WHERE phone = ?'
    )
    .get(phone.trim()) as
    | {
        id: number;
        name: string;
        role: WorkerRole;
        phone: string;
        phc_name: string;
        taluk: string;
        district: string;
        password_hash: string;
        avatar_url: string;
      }
    | undefined;

  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone,
    phcName: row.phc_name,
    taluk: row.taluk,
    district: row.district,
    avatarUrl: row.avatar_url,
  };
}

export function registerWorker(
  db: Database.Database,
  input: {
    name: string;
    role: WorkerRole;
    phone: string;
    phcName: string;
    taluk: string;
    district: string;
    password: string;
  }
): WorkerProfile {
  const passwordHash = bcrypt.hashSync(input.password, 10);
  const avatarUrl = '/src/assets/images/avatar_asha_worker_1795142762159.jpg';

  const result = db
    .prepare(
      `INSERT INTO workers (name, role, phone, phc_name, taluk, district, password_hash, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name.trim(),
      input.role,
      input.phone.trim(),
      input.phcName.trim(),
      input.taluk.trim(),
      input.district.trim(),
      passwordHash,
      avatarUrl
    );

  return {
    id: Number(result.lastInsertRowid),
    name: input.name.trim(),
    role: input.role,
    phone: input.phone.trim(),
    phcName: input.phcName.trim(),
    taluk: input.taluk.trim(),
    district: input.district.trim(),
    avatarUrl,
  };
}

interface RawVisitRow {
  id: number;
  worker_id: number;
  worker_name?: string;
  patient_name: string;
  patient_age: number;
  village: string;
  phc_name: string;
  district: string;
  category: VisitCategory;
  gestational_weeks: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  hemoglobin: number | null;
  weight_kg: number | null;
  symptoms: string;
  counseling_given: string;
  ifa_tablets_given: number;
  immunization_status: string;
  raw_transcript: string;
  language: LanguageCode;
  risk_level: RiskLevel;
  risk_reasons: string;
  recommended_action: string;
  followup_status: FollowUpStatus;
  visit_date: string;
  next_visit_date: string;
  created_at: string;
}

function mapVisitRow(row: RawVisitRow): VisitRecord {
  let parsedReasons: string[] = [];
  try {
    parsedReasons = JSON.parse(row.risk_reasons);
  } catch {
    parsedReasons = [];
  }

  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    patientName: row.patient_name,
    patientAge: row.patient_age,
    village: row.village,
    phcName: row.phc_name,
    district: row.district,
    category: row.category,
    gestationalWeeks: row.gestational_weeks,
    bpSystolic: row.bp_systolic,
    bpDiastolic: row.bp_diastolic,
    hemoglobin: row.hemoglobin,
    weightKg: row.weight_kg,
    symptoms: row.symptoms,
    counselingGiven: row.counseling_given,
    ifaTabletsGiven: row.ifa_tablets_given,
    immunizationStatus: row.immunization_status,
    rawTranscript: row.raw_transcript,
    language: row.language,
    riskLevel: row.risk_level,
    riskReasons: parsedReasons,
    recommendedAction: row.recommended_action,
    followUpStatus: row.followup_status,
    visitDate: row.visit_date,
    nextVisitDate: row.next_visit_date,
    createdAt: row.created_at,
  };
}

export function listVisits(db: Database.Database): VisitRecord[] {
  const rows = db
    .prepare(
      `SELECT v.*, w.name as worker_name
       FROM visits v
       LEFT JOIN workers w ON w.id = v.worker_id
       ORDER BY v.visit_date DESC, v.id DESC`
    )
    .all() as RawVisitRow[];

  return rows.map(mapVisitRow);
}

export function createVisitRecord(
  db: Database.Database,
  workerId: number,
  input: VisitInput,
  initialFollowUpStatus: FollowUpStatus = 'pending'
): VisitRecord {
  const visitDate = (input.visitDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const triage = assessClinicalRisk({
    category: input.category,
    patientAge: input.patientAge,
    gestationalWeeks: input.gestationalWeeks ?? null,
    bpSystolic: input.bpSystolic ?? null,
    bpDiastolic: input.bpDiastolic ?? null,
    hemoglobin: input.hemoglobin ?? null,
    weightKg: input.weightKg ?? null,
    symptoms: input.symptoms ?? '',
  });
  const nextVisitDate = computeNextVisitDate(visitDate, triage.suggestedFollowUpDays);

  const info = db
    .prepare(
      `INSERT INTO visits (
        worker_id, patient_name, patient_age, village, phc_name, district,
        category, gestational_weeks, bp_systolic, bp_diastolic, hemoglobin, weight_kg,
        symptoms, counseling_given, ifa_tablets_given, immunization_status,
        raw_transcript, language, risk_level, risk_reasons, recommended_action,
        followup_status, visit_date, next_visit_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      workerId,
      input.patientName.trim(),
      input.patientAge,
      input.village.trim(),
      (input.phcName || 'Doddaballapura PHC').trim(),
      (input.district || 'Bengaluru Rural').trim(),
      input.category,
      input.gestationalWeeks ?? null,
      input.bpSystolic ?? null,
      input.bpDiastolic ?? null,
      input.hemoglobin ?? null,
      input.weightKg ?? null,
      (input.symptoms || '').trim(),
      (input.counselingGiven || '').trim(),
      input.ifaTabletsGiven ?? 0,
      (input.immunizationStatus || '').trim(),
      (input.rawTranscript || '').trim(),
      input.language || 'en',
      triage.riskLevel,
      JSON.stringify(triage.riskReasons),
      triage.recommendedAction,
      initialFollowUpStatus,
      visitDate,
      nextVisitDate
    );

  const created = db
    .prepare(
      `SELECT v.*, w.name as worker_name
       FROM visits v
       LEFT JOIN workers w ON w.id = v.worker_id
       WHERE v.id = ?`
    )
    .get(Number(info.lastInsertRowid)) as RawVisitRow;

  return mapVisitRow(created);
}

export function updateVisitStatus(
  db: Database.Database,
  id: number,
  updates: { followUpStatus?: FollowUpStatus; counselingGiven?: string }
): VisitRecord | null {
  const existing = db.prepare('SELECT * FROM visits WHERE id = ?').get(id) as RawVisitRow | undefined;
  if (!existing) return null;

  const nextStatus = updates.followUpStatus ?? existing.followup_status;
  const nextCounseling =
    updates.counselingGiven !== undefined ? updates.counselingGiven.trim() : existing.counseling_given;

  db.prepare('UPDATE visits SET followup_status = ?, counseling_given = ? WHERE id = ?').run(
    nextStatus,
    nextCounseling,
    id
  );

  const updated = db
    .prepare(
      `SELECT v.*, w.name as worker_name
       FROM visits v
       LEFT JOIN workers w ON w.id = v.worker_id
       WHERE v.id = ?`
    )
    .get(id) as RawVisitRow;

  return mapVisitRow(updated);
}

export function deleteVisitRecord(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM visits WHERE id = ?').run(id);
  return result.changes > 0;
}

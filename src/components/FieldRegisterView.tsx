import {
  Download,
  FileSpreadsheet,
  Loader2,
  Mic,
  MicOff,
  Save,
  Search,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type {
  FollowUpStatus,
  LanguageCode,
  RiskLevel,
  VisitCategory,
  VisitInput,
  VisitRecord,
  WorkerProfile,
} from '../types/health';
import { assessClinicalRisk, filterAndSortVisits } from '../utils/clinicalTriage';
import { exportVisitsToExcel, exportVisitsToPdf } from '../utils/exportRegister';
import { FollowUpStatusText, RiskStatusText } from './RiskLabel';

interface FieldRegisterViewProps {
  visits: VisitRecord[];
  activeWorker: WorkerProfile;
  mode?: 'full' | 'intake';
  onOpenFullRegister?: () => void;
  onCreateVisit: (input: VisitInput) => Promise<VisitRecord>;
  onUpdateFollowUp: (visitId: number, status: FollowUpStatus) => Promise<void>;
  onDeleteVisit: (visitId: number) => Promise<void>;
}

const SAMPLE_NOTES: Array<{ label: string; lang: LanguageCode; text: string }> = [
  {
    label: 'Kannada ANC (High Risk)',
    lang: 'kn',
    text: 'ಲಕ್ಷ್ಮಿ ಬಾಯಿ, 25 ವರ್ಷ, ಗುಂಡ್ಲುಪೇಟೆ ಗ್ರಾಮ, 7 ತಿಂಗಳ ಗರ್ಭಿಣಿ (28 ವಾರ), BP 148/96, Hb 8.4, ಕಾಲು ಊತ ಮತ್ತು ತಲೆನೋವು ಇದೆ, 30 IFA ಮಾತ್ರೆ ಕೊಟ್ಟಿದ್ದೇನೆ, PHC ರೆಫರಲ್ ಸಲಹೆ ನೀಡಿದೆ.',
  },
  {
    label: 'Hindi PNC (Moderate)',
    lang: 'hi',
    text: 'सुमन वर्मा, उम्र 24 साल, ग्राम रामपुर, प्रसव के 12 दिन बाद की जांच, BP 118/76, Hb 9.5, हल्की कमजोरी है, वजन 48 किलो, 30 आयरन की गोली और पौष्टिक आहार की सलाह दी।',
  },
  {
    label: 'English Child Care',
    lang: 'en',
    text: 'Baby Kavya age 1, village Rajaghatta, weight 8.6 kg, Pentavalent-3 and OPV-3 vaccine completed at VHSND, active and feeding well, breastfeeding counseling reinforced.',
  },
];

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function FieldRegisterView({
  visits,
  activeWorker,
  mode = 'full',
  onOpenFullRegister,
  onCreateVisit,
  onUpdateFollowUp,
  onDeleteVisit,
}: FieldRegisterViewProps) {
  // Voice & AI Extraction state
  const [language, setLanguage] = useState<LanguageCode>('kn');
  const [rawTranscript, setRawTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [aiSummary, setAiSummary] = useState('');

  // Structured clinical form state
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [village, setVillage] = useState('');
  const [category, setCategory] = useState<VisitCategory>('ANC');
  const [gestationalWeeks, setGestationalWeeks] = useState('');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [hemoglobin, setHemoglobin] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [ifaTabletsGiven, setIfaTabletsGiven] = useState('30');
  const [immunizationStatus, setImmunizationStatus] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [counselingGiven, setCounselingGiven] = useState('');
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [formError, setFormError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Register table filters
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<VisitCategory | 'all'>('all');
  const [speakingVisitId, setSpeakingVisitId] = useState<number | null>(null);
  const [ttsError, setTtsError] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Live deterministic NHM risk preview as ASHA fills vitals
  const liveRisk = useMemo(() => {
    return assessClinicalRisk({
      category,
      patientAge: patientAge ? Number(patientAge) : null,
      gestationalWeeks: gestationalWeeks ? Number(gestationalWeeks) : null,
      bpSystolic: bpSystolic ? Number(bpSystolic) : null,
      bpDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
      hemoglobin: hemoglobin ? Number(hemoglobin) : null,
      weightKg: weightKg ? Number(weightKg) : null,
      symptoms,
    });
  }, [category, patientAge, gestationalWeeks, bpSystolic, bpDiastolic, hemoglobin, weightKg, symptoms]);

  const filteredVisits = useMemo(() => {
    return filterAndSortVisits(visits, {
      search,
      riskLevel: riskFilter,
      category: categoryFilter,
    });
  }, [visits, search, riskFilter, categoryFilter]);

  async function extractFromServer(payload: {
    transcript?: string;
    audioBase64?: string;
    mimeType?: string;
  }) {
    setExtractError('');
    setIsExtracting(true);
    try {
      const res = await fetch('/api/extract-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          languageHint: language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error || 'Could not extract structured fields.');
        return;
      }

      if (data.transcript && !rawTranscript.trim()) {
        setRawTranscript(data.transcript);
      }

      const d = data.draft;
      if (d) {
        setPatientName(d.patientName || '');
        setPatientAge(d.patientAge !== null && d.patientAge !== undefined ? String(d.patientAge) : '');
        setVillage(d.village || '');
        setCategory(d.category || 'ANC');
        setGestationalWeeks(d.gestationalWeeks !== null && d.gestationalWeeks !== undefined ? String(d.gestationalWeeks) : '');
        setBpSystolic(d.bpSystolic !== null && d.bpSystolic !== undefined ? String(d.bpSystolic) : '');
        setBpDiastolic(d.bpDiastolic !== null && d.bpDiastolic !== undefined ? String(d.bpDiastolic) : '');
        setHemoglobin(d.hemoglobin !== null && d.hemoglobin !== undefined ? String(d.hemoglobin) : '');
        setWeightKg(d.weightKg !== null && d.weightKg !== undefined ? String(d.weightKg) : '');
        setIfaTabletsGiven(String(d.ifaTabletsGiven ?? 0));
        setImmunizationStatus(d.immunizationStatus || '');
        setSymptoms(d.symptoms || '');
        setCounselingGiven(d.counselingGiven || '');
        setAiSummary(d.englishSummary || '');
      }
    } catch {
      setExtractError('Network error while contacting extraction service.');
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleToggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    setExtractError('');
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = language === 'kn' ? 'kn-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const chunks: string[] = [];
        for (let i = 0; i < event.results.length; i++) {
          chunks.push(event.results[i][0].transcript);
        }
        setRawTranscript(chunks.join(' ').trim());
      };
      recognition.onerror = () => {
        setIsRecording(false);
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      return;
    }

    // Fallback to MediaRecorder audio upload -> Gemini 3.5 Transcribe
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const buffer = await blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          await extractFromServer({ audioBase64: base64, mimeType: blob.type || 'audio/webm' });
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
      } catch {
        setExtractError('Microphone access was denied or unavailable. Type or load a sample note below.');
      }
    } else {
      setExtractError('Voice recording is unavailable in this browser. Type or load a sample note below.');
    }
  }

  async function handleSaveVisit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaveSuccess('');

    if (!patientName.trim() || !village.trim()) {
      setFormError('Beneficiary name and village are required.');
      return;
    }
    const ageNum = Number(patientAge);
    if (!patientAge || !Number.isFinite(ageNum) || ageNum < 0 || ageNum > 110) {
      setFormError('Please enter a valid age between 0 and 110.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await onCreateVisit({
        patientName: patientName.trim(),
        patientAge: Math.round(ageNum),
        village: village.trim(),
        phcName: activeWorker.phcName,
        district: activeWorker.district,
        category,
        gestationalWeeks: gestationalWeeks ? Number(gestationalWeeks) : null,
        bpSystolic: bpSystolic ? Number(bpSystolic) : null,
        bpDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
        hemoglobin: hemoglobin ? Number(hemoglobin) : null,
        weightKg: weightKg ? Number(weightKg) : null,
        symptoms: symptoms.trim(),
        counselingGiven: counselingGiven.trim(),
        ifaTabletsGiven: ifaTabletsGiven ? Number(ifaTabletsGiven) : 0,
        immunizationStatus: immunizationStatus.trim(),
        rawTranscript: rawTranscript.trim(),
        language,
        visitDate,
      });

      setSaveSuccess(
        `Saved visit for ${created.patientName} (${created.riskLevel.toUpperCase()} risk · Next visit ${created.nextVisitDate}).`
      );
      setPatientName('');
      setPatientAge('');
      setVillage('');
      setGestationalWeeks('');
      setBpSystolic('');
      setBpDiastolic('');
      setHemoglobin('');
      setWeightKg('');
      setSymptoms('');
      setCounselingGiven('');
      setImmunizationStatus('');
      setRawTranscript('');
      setAiSummary('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save visit record.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSpeakVisit(visit: VisitRecord) {
    setTtsError('');
    setSpeakingVisitId(visit.id);
    try {
      const text = `Visit record for ${visit.patientName}, age ${visit.patientAge}, from ${visit.village}. Category: ${visit.category}. Risk status: ${visit.riskLevel}. Recommended action: ${visit.recommendedAction}`;
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTtsError(data.error || 'Could not synthesize audio.');
        return;
      }
      const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
      await audio.play();
    } catch {
      setTtsError('Audio playback unavailable.');
    } finally {
      setSpeakingVisitId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Voice & Structured Intake Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Voice / Multilingual Note Input */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Multilingual Voice &amp; Note Intake
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dictate or paste Kannada, Hindi, or English visit notes
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { code: 'kn', label: 'Kannada' },
                  { code: 'hi', label: 'Hindi' },
                  { code: 'en', label: 'English' },
                ] as const
              ).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLanguage(item.code)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    language === item.code
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {SAMPLE_NOTES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setLanguage(sample.lang);
                  setRawTranscript(sample.text);
                  setExtractError('');
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="field-transcript" className="block text-xs font-medium text-slate-700 mb-1.5">
              Spoken or Typed Field Note
            </label>
            <textarea
              id="field-transcript"
              rows={5}
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder="Tap Start Voice Note or enter a Kannada, Hindi, or English home visit note (e.g., name, age, village, BP, Hb, symptoms, IFA given)..."
              className="w-full px-3 py-2.5 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          {extractError && (
            <div className="px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {extractError}
            </div>
          )}

          {aiSummary && (
            <div className="px-3 py-2.5 text-xs text-teal-900 bg-teal-50/70 border border-teal-200 rounded-lg">
              <span className="font-semibold">Extracted Summary: </span>
              {aiSummary}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleToggleRecording}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                isRecording
                  ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                  Start Voice Note
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isExtracting || !rawTranscript.trim()}
              onClick={() => extractFromServer({ transcript: rawTranscript })}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                  Extracting Fields...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Extract &amp; Structure
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right: Structured Clinical Register Form */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Structured Clinical Register Entry
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeWorker.phcName} · {activeWorker.district} District
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Live Triage:</span>
              <RiskStatusText level={liveRisk.riskLevel} />
            </div>
          </div>

          <form onSubmit={handleSaveVisit} className="mt-4 space-y-4">
            {formError && (
              <div className="px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {formError}
              </div>
            )}
            {saveSuccess && (
              <div className="px-3 py-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
                {saveSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="visit-patient-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Beneficiary Name *
                </label>
                <input
                  id="visit-patient-name"
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Lakshmi Devi"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label htmlFor="visit-age" className="block text-xs font-medium text-slate-700 mb-1">
                  Age (yrs) *
                </label>
                <input
                  id="visit-age"
                  type="number"
                  min={0}
                  max={110}
                  required
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="26"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label htmlFor="visit-date" className="block text-xs font-medium text-slate-700 mb-1">
                  Visit Date
                </label>
                <input
                  id="visit-date"
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="visit-village" className="block text-xs font-medium text-slate-700 mb-1">
                  Village / Ward *
                </label>
                <input
                  id="visit-village"
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Hosahalli"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label htmlFor="visit-category" className="block text-xs font-medium text-slate-700 mb-1">
                  Visit Category
                </label>
                <select
                  id="visit-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VisitCategory)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="ANC">ANC (Antenatal)</option>
                  <option value="PNC">PNC (Postnatal)</option>
                  <option value="Child Care">Child Care</option>
                  <option value="Nutrition">Nutrition</option>
                </select>
              </div>
              <div>
                <label htmlFor="visit-weeks" className="block text-xs font-medium text-slate-700 mb-1">
                  Gestation (Weeks)
                </label>
                <input
                  id="visit-weeks"
                  type="number"
                  min={1}
                  max={44}
                  value={gestationalWeeks}
                  onChange={(e) => setGestationalWeeks(e.target.value)}
                  placeholder="e.g. 28"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label htmlFor="visit-bp-sys" className="block text-xs font-medium text-slate-700 mb-1">
                  BP Systolic
                </label>
                <input
                  id="visit-bp-sys"
                  type="number"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  placeholder="120"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label htmlFor="visit-bp-dia" className="block text-xs font-medium text-slate-700 mb-1">
                  BP Diastolic
                </label>
                <input
                  id="visit-bp-dia"
                  type="number"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  placeholder="80"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label htmlFor="visit-hb" className="block text-xs font-medium text-slate-700 mb-1">
                  Hb (g/dL)
                </label>
                <input
                  id="visit-hb"
                  type="number"
                  step="0.1"
                  value={hemoglobin}
                  onChange={(e) => setHemoglobin(e.target.value)}
                  placeholder="11.2"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label htmlFor="visit-weight" className="block text-xs font-medium text-slate-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  id="visit-weight"
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="52.0"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label htmlFor="visit-ifa" className="block text-xs font-medium text-slate-700 mb-1">
                  IFA Tablets
                </label>
                <input
                  id="visit-ifa"
                  type="number"
                  min={0}
                  value={ifaTabletsGiven}
                  onChange={(e) => setIfaTabletsGiven(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="visit-symptoms" className="block text-xs font-medium text-slate-700 mb-1">
                  Symptoms &amp; Danger Signs
                </label>
                <input
                  id="visit-symptoms"
                  type="text"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Pedal edema, headache, or None"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label htmlFor="visit-immunization" className="block text-xs font-medium text-slate-700 mb-1">
                  Immunization Status
                </label>
                <input
                  id="visit-immunization"
                  type="text"
                  value={immunizationStatus}
                  onChange={(e) => setImmunizationStatus(e.target.value)}
                  placeholder="e.g. TT-2 Done / Penta-3 Completed"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="visit-counseling" className="block text-xs font-medium text-slate-700 mb-1">
                Counseling &amp; Action Taken
              </label>
              <input
                id="visit-counseling"
                type="text"
                value={counselingGiven}
                onChange={(e) => setCounselingGiven(e.target.value)}
                placeholder="e.g. Iron-rich diet counseled; referred to PHC if BP remains high"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            {/* Deterministic Clinical Triage Preview */}
            <div className="pt-3 border-t border-slate-200 text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-700">
                  NHM Triage Assessment: {liveRisk.riskReasons.join(' · ')}
                </span>
                <span className="font-mono tabular-nums text-slate-500">
                  Follow-up in {liveRisk.suggestedFollowUpDays} days
                </span>
              </div>
              <p className="text-slate-600">{liveRisk.recommendedAction}</p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
                {isSaving ? 'Saving Visit...' : 'Save Visit to Register'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {mode === 'intake' ? (
        <section className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            Saved voice notes are stored in the ASHA Home Visit Register ({visits.length} total records).
          </p>
          {onOpenFullRegister && (
            <button
              type="button"
              onClick={onOpenFullRegister}
              className="px-3.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap"
            >
              View Full Register Table
            </button>
          )}
        </section>
      ) : (
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                ASHA Home Visit Register
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                Showing {filteredVisits.length} of {visits.length} persisted records
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  exportVisitsToPdf(filteredVisits, `${activeWorker.phcName} · ${activeWorker.district}`)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Export PDF
              </button>

              <button
                type="button"
                onClick={() => exportVisitsToExcel(filteredVisits)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Export Excel
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                aria-label="Search visits by name, village, or symptom"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, village..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 w-56"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-full">
              {(['all', 'high', 'moderate', 'normal'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setRiskFilter(lvl)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    riskFilter === lvl
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl === 'all' ? 'All Risks' : lvl === 'high' ? 'High' : lvl === 'moderate' ? 'Moderate' : 'Normal'}
                </button>
              ))}
            </div>

            <select
              aria-label="Filter by visit category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as VisitCategory | 'all')}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="all">All Categories</option>
              <option value="ANC">ANC</option>
              <option value="PNC">PNC</option>
              <option value="Child Care">Child Care</option>
              <option value="Nutrition">Nutrition</option>
            </select>
          </div>
        </div>

        {ttsError && (
          <div className="mx-5 mt-3 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {ttsError}
          </div>
        )}

        {filteredVisits.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-900">No matching visit records found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try clearing your search or risk filters, or log a new home visit above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Beneficiary</th>
                  <th className="py-2.5 px-4">Village</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">BP</th>
                  <th className="py-2.5 px-4 text-right">Hb</th>
                  <th className="py-2.5 px-4">Symptoms &amp; Notes</th>
                  <th className="py-2.5 px-4">Risk</th>
                  <th className="py-2.5 px-4">Follow-up</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                      {v.visitDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-medium text-slate-900">{v.patientName}</p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        {v.patientAge}y{v.gestationalWeeks ? ` · ${v.gestationalWeeks}w` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {v.village}
                      <span className="block text-slate-400">{v.district}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {v.category}
                      {v.ifaTabletsGiven > 0 && (
                        <span className="block text-slate-400 font-mono tabular-nums">
                          {v.ifaTabletsGiven} IFA
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                      {v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                      {v.hemoglobin !== null ? `${v.hemoglobin.toFixed(1)}` : '—'}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-xs text-slate-800 truncate" title={v.symptoms}>
                        {v.symptoms || 'None reported'}
                      </p>
                      <p className="text-xs text-slate-500 truncate" title={v.counselingGiven}>
                        {v.counselingGiven || v.recommendedAction}
                      </p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <RiskStatusText level={v.riskLevel} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <FollowUpStatusText status={v.followUpStatus} />
                      <span className="block text-[11px] font-mono tabular-nums text-slate-400">
                        Due {v.nextVisitDate}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSpeakVisit(v)}
                          aria-label={`Read care plan aloud for ${v.patientName}`}
                          disabled={speakingVisitId === v.id}
                          className="p-1.5 rounded-md text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors disabled:opacity-50"
                          title="Read Care Plan Aloud"
                        >
                          {speakingVisitId === v.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {v.followUpStatus === 'pending' && (
                          <button
                            type="button"
                            onClick={() => onUpdateFollowUp(v.id, 'completed')}
                            className="px-2 py-1 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors"
                          >
                            Done
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteVisit(v.id)}
                          aria-label={`Delete visit for ${v.patientName}`}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Delete Visit"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}
    </div>
  );
}

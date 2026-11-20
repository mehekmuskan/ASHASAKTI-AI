import { GoogleGenAI, Type } from '@google/genai';
import type {
  ExtractedVisitDraft,
  LanguageCode,
  NfhsDistrictRecord,
  VisitCategory,
} from '../src/types/health';
import { assessClinicalRisk } from '../src/utils/clinicalTriage';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function transcribeAudioRecording(
  audioBase64: string,
  mimeType: string
): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/webm',
            data: audioBase64,
          },
        },
        {
          text: 'Transcribe this ASHA community health worker voice note accurately. Preserve spoken Kannada, Hindi, or English medical details, patient name, age, village, BP, hemoglobin (Hb), weight, and symptoms.',
        },
      ],
    },
  });
  return (response.text ?? '').trim();
}

export async function extractStructuredVisit(
  transcript: string,
  languageHint: LanguageCode = 'kn'
): Promise<ExtractedVisitDraft> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Extract structured ASHA home-visit clinical register data from the following field note (language hint: ${languageHint}). Translate symptoms and counseling into clear clinical English while preserving local patient and village names accurately.\n\nField Note:\n${transcript}`,
    config: {
      systemInstruction:
        'You are a clinical field-register assistant for Karnataka ASHA workers under India National Health Mission (NHM). Extract exact vitals (BP systolic/diastolic, Hemoglobin g/dL, weight kg, gestational weeks, IFA tablets distributed) without inventing missing vitals—use null when a numeric vital is not stated.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          patientName: { type: Type.STRING, description: 'Full name of mother or child' },
          patientAge: { type: Type.INTEGER, nullable: true, description: 'Age in years (or 0-1 for infant)' },
          village: { type: Type.STRING, description: 'Village, ward, or hamlet name' },
          category: {
            type: Type.STRING,
            description: 'Must be one of: ANC, PNC, Child Care, Nutrition',
          },
          gestationalWeeks: { type: Type.INTEGER, nullable: true, description: 'Weeks of pregnancy if ANC' },
          bpSystolic: { type: Type.INTEGER, nullable: true, description: 'Systolic blood pressure mmHg' },
          bpDiastolic: { type: Type.INTEGER, nullable: true, description: 'Diastolic blood pressure mmHg' },
          hemoglobin: { type: Type.NUMBER, nullable: true, description: 'Hemoglobin in g/dL' },
          weightKg: { type: Type.NUMBER, nullable: true, description: 'Weight in kg' },
          symptoms: { type: Type.STRING, description: 'Clinical symptoms or danger signs in English' },
          counselingGiven: { type: Type.STRING, description: 'Counseling or care provided by ASHA worker' },
          ifaTabletsGiven: { type: Type.INTEGER, description: 'Number of IFA tablets distributed (0 if none)' },
          immunizationStatus: { type: Type.STRING, description: 'Vaccines given or scheduled (e.g., TT-2, Penta-3)' },
          englishSummary: { type: Type.STRING, description: 'Concise 1-sentence clinical summary in English' },
          detectedLanguage: { type: Type.STRING, description: 'Detected language code: kn, hi, or en' },
        },
        required: ['patientName', 'category', 'symptoms', 'counselingGiven', 'englishSummary'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as {
    patientName?: string;
    patientAge?: number | null;
    village?: string;
    category?: string;
    gestationalWeeks?: number | null;
    bpSystolic?: number | null;
    bpDiastolic?: number | null;
    hemoglobin?: number | null;
    weightKg?: number | null;
    symptoms?: string;
    counselingGiven?: string;
    ifaTabletsGiven?: number;
    immunizationStatus?: string;
    englishSummary?: string;
    detectedLanguage?: string;
  };

  const allowedCategories: VisitCategory[] = ['ANC', 'PNC', 'Child Care', 'Nutrition'];
  const category: VisitCategory = allowedCategories.includes(parsed.category as VisitCategory)
    ? (parsed.category as VisitCategory)
    : 'ANC';

  const detectedLanguage: LanguageCode =
    parsed.detectedLanguage === 'kn' || parsed.detectedLanguage === 'hi' || parsed.detectedLanguage === 'en'
      ? parsed.detectedLanguage
      : languageHint;

  const riskAssessment = assessClinicalRisk({
    category,
    patientAge: parsed.patientAge ?? null,
    gestationalWeeks: parsed.gestationalWeeks ?? null,
    bpSystolic: parsed.bpSystolic ?? null,
    bpDiastolic: parsed.bpDiastolic ?? null,
    hemoglobin: parsed.hemoglobin ?? null,
    weightKg: parsed.weightKg ?? null,
    symptoms: parsed.symptoms ?? '',
  });

  return {
    patientName: parsed.patientName?.trim() || 'Unknown Beneficiary',
    patientAge: parsed.patientAge ?? null,
    village: parsed.village?.trim() || '',
    category,
    gestationalWeeks: parsed.gestationalWeeks ?? null,
    bpSystolic: parsed.bpSystolic ?? null,
    bpDiastolic: parsed.bpDiastolic ?? null,
    hemoglobin: parsed.hemoglobin ?? null,
    weightKg: parsed.weightKg ?? null,
    symptoms: parsed.symptoms?.trim() || 'None reported',
    counselingGiven: parsed.counselingGiven?.trim() || '',
    ifaTabletsGiven: Number.isFinite(parsed.ifaTabletsGiven) ? Number(parsed.ifaTabletsGiven) : 0,
    immunizationStatus: parsed.immunizationStatus?.trim() || '',
    englishSummary: parsed.englishSummary?.trim() || '',
    detectedLanguage,
    riskAssessment,
  };
}

export async function generateDistrictPolicyBrief(params: {
  district: NfhsDistrictRecord;
  stateBaseline: NfhsDistrictRecord;
  question?: string;
}): Promise<string> {
  const ai = getGeminiClient();
  const { district, stateBaseline, question } = params;

  const prompt = `
Selected Karnataka District: ${district.district} (${district.division} Division)
NFHS-5 (2019-21) District Indicators vs Karnataka State Average:
- 4+ ANC Visits: ${district.anc4PlusPct}% (State: ${stateBaseline.anc4PlusPct}%)
- Institutional Births: ${district.institutionalBirthPct}% (State: ${stateBaseline.institutionalBirthPct}%)
- IFA 100+ Days Consumption: ${district.ifa100DaysPct}% (State: ${stateBaseline.ifa100DaysPct}%)
- Pregnant Women Anaemic: ${district.pregnantWomenAnaemicPct}% (State: ${stateBaseline.pregnantWomenAnaemicPct}%)
- Children (6-59m) Anaemic: ${district.childrenAnaemicPct}% (State: ${stateBaseline.childrenAnaemicPct}%)
- Full Immunization (12-23m): ${district.fullImmunizationPct}% (State: ${stateBaseline.fullImmunizationPct}%)
- Under-5 Stunting: ${district.stuntingPct}% (State: ${stateBaseline.stuntingPct}%)
- Under-5 Wasting: ${district.wastingPct}% (State: ${stateBaseline.wastingPct}%)
- Under-5 Underweight: ${district.underweightPct}% (State: ${stateBaseline.underweightPct}%)

User Question / Focus: ${question?.trim() || 'Provide a concise 3-point ASHA & PHC operational action plan addressing the biggest maternal and child health gaps in this district.'}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a Karnataka Public Health Specialist advising Taluk Health Officers and ASHA Supervisors. Cite exact percentages from the provided NFHS-5 table, keep recommendations concrete and grounded in NHM Karnataka workflows (VHSND, Anaemia Mukt Bharat, Take-Home Ration, High-Risk ANC tracking), and format cleanly in short bullet points without markdown clutter.',
    },
  });

  return (response.text ?? '').trim();
}

export async function synthesizeCarePlanAudio(text: string): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text,
            speechMetadata: {
              style: 'Warm, clear, reassuring community health supervisor speaking to an ASHA worker',
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('Audio synthesis did not return WAV output.');
  }
  return base64Audio;
}

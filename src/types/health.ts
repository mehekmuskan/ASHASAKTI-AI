export type RiskLevel = 'high' | 'moderate' | 'normal';

export type VisitCategory = 'ANC' | 'PNC' | 'Child Care' | 'Nutrition';

export type FollowUpStatus = 'pending' | 'completed' | 'referred';

export type LanguageCode = 'kn' | 'hi' | 'en';

export type WorkerRole = 'ASHA Worker' | 'Taluk Health Officer';

export interface WorkerProfile {
  id: number;
  name: string;
  role: WorkerRole;
  phone: string;
  phcName: string;
  taluk: string;
  district: string;
  avatarUrl: string;
}

export interface VisitRecord {
  id: number;
  workerId: number;
  workerName?: string;
  patientName: string;
  patientAge: number;
  village: string;
  phcName: string;
  district: string;
  category: VisitCategory;
  gestationalWeeks: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  hemoglobin: number | null;
  weightKg: number | null;
  symptoms: string;
  counselingGiven: string;
  ifaTabletsGiven: number;
  immunizationStatus: string;
  rawTranscript: string;
  language: LanguageCode;
  riskLevel: RiskLevel;
  riskReasons: string[];
  recommendedAction: string;
  followUpStatus: FollowUpStatus;
  visitDate: string;
  nextVisitDate: string;
  createdAt: string;
}

export interface VisitInput {
  patientName: string;
  patientAge: number;
  village: string;
  phcName?: string;
  district?: string;
  category: VisitCategory;
  gestationalWeeks?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  hemoglobin?: number | null;
  weightKg?: number | null;
  symptoms?: string;
  counselingGiven?: string;
  ifaTabletsGiven?: number;
  immunizationStatus?: string;
  rawTranscript?: string;
  language?: LanguageCode;
  visitDate?: string;
}

export interface ExtractedVisitDraft {
  patientName: string;
  patientAge: number | null;
  village: string;
  category: VisitCategory;
  gestationalWeeks: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  hemoglobin: number | null;
  weightKg: number | null;
  symptoms: string;
  counselingGiven: string;
  ifaTabletsGiven: number;
  immunizationStatus: string;
  englishSummary: string;
  detectedLanguage: LanguageCode;
  riskAssessment: RiskAssessmentResult;
}

export interface RiskAssessmentResult {
  riskLevel: RiskLevel;
  riskReasons: string[];
  recommendedAction: string;
  suggestedFollowUpDays: number;
}

export interface BeneficiaryCohort {
  key: string;
  patientName: string;
  patientAge: number;
  village: string;
  district: string;
  phcName: string;
  primaryCategory: VisitCategory;
  latestVisit: VisitRecord;
  visitCount: number;
  visits: VisitRecord[];
  highestRisk: RiskLevel;
  pendingFollowUp: boolean;
}

export interface RegisterSummaryMetrics {
  totalVisits: number;
  highRiskCount: number;
  moderateRiskCount: number;
  normalCount: number;
  pendingFollowUps: number;
  completedOrReferred: number;
  ifaDistributedTotal: number;
  ifaCoveragePct: number;
  ancVisitsCount: number;
  childVisitsCount: number;
}

export interface NfhsDistrictRecord {
  id: string;
  district: string;
  division: 'Bengaluru' | 'Mysuru' | 'Belagavi' | 'Kalaburagi' | 'Statewide';
  isStateAverage?: boolean;
  anc4PlusPct: number;
  institutionalBirthPct: number;
  ifa100DaysPct: number;
  pregnantWomenAnaemicPct: number;
  childrenAnaemicPct: number;
  fullImmunizationPct: number;
  stuntingPct: number;
  wastingPct: number;
  underweightPct: number;
}

export type NfhsIndicatorKey =
  | 'anc4PlusPct'
  | 'institutionalBirthPct'
  | 'ifa100DaysPct'
  | 'pregnantWomenAnaemicPct'
  | 'childrenAnaemicPct'
  | 'fullImmunizationPct'
  | 'stuntingPct'
  | 'wastingPct'
  | 'underweightPct';

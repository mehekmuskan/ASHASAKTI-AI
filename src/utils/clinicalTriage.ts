import type {
  BeneficiaryCohort,
  FollowUpStatus,
  RegisterSummaryMetrics,
  RiskAssessmentResult,
  RiskLevel,
  VisitCategory,
  VisitRecord,
} from '../types/health';

export interface TriageInput {
  category: VisitCategory;
  patientAge?: number | null;
  gestationalWeeks?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  hemoglobin?: number | null;
  weightKg?: number | null;
  symptoms?: string;
}

const HIGH_RISK_SYMPTOM_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(bleed|hemorrhage|ರಕ್ತಸ್ರಾವ|रक्तस्राव|खून)/i, label: 'Abnormal bleeding reported' },
  { pattern: /(seizure|convulsion|fits|ಮೂರ್ಛೆ|दौरे)/i, label: 'Convulsions / eclampsia sign' },
  { pattern: /(vision|blur|ದೃಷ್ಟಿ|धुंधला)/i, label: 'Blurred vision (pre-eclampsia warning)' },
  { pattern: /(severe headache|ತೀವ್ರ ತಲೆನೋವು|तेज सिरदर्द)/i, label: 'Severe persistent headache' },
  { pattern: /(edema|swelling|ಊತ|सूजन)/i, label: 'Pedal / facial edema' },
  { pattern: /(reduced fetal|no movement|ಮಗುವಿನ ಚಲನೆ|हलचल कम)/i, label: 'Reduced fetal movement' },
  { pattern: /(fast breath|chest indraw|letharg|ಉಸಿರಾಟ|सांस तेज|सुस्त)/i, label: 'Infant respiratory distress / lethargy' },
  { pattern: /(high fever|102|103|ತೀವ್ರ ಜ್ವರ|तेज बुखार)/i, label: 'High fever requiring medical review' },
];

const MODERATE_SYMPTOM_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(dizzy|dizziness|fatigue|tired|ತಲೆತಿರುಗುವಿಕೆ|सुस्ती|कमजोरी|ಚक्कर)/i, label: 'Maternal fatigue / dizziness' },
  { pattern: /(vomit|nausea|ವಾಂತಿ|उल्टी)/i, label: 'Persistent nausea / vomiting' },
  { pattern: /(cough|cold|diarrh|ಕೆಮ್ಮು|ಭೇದಿ|दस्त|खांसी)/i, label: 'Acute cough or diarrhea episode' },
  { pattern: /(low appetite|poor feeding|not feeding|difficulty feeding|ಹಸಿವು ಇಲ್ಲ|दूध नहीं)/i, label: 'Poor feeding / low appetite' },
];

/**
 * Deterministic NHM / MoHFW ASHA clinical risk triage engine.
 * Classifies maternal, postnatal, and child visits into high, moderate, or normal risk
 * using explicit vital thresholds and danger-sign patterns.
 */
export function assessClinicalRisk(input: TriageInput): RiskAssessmentResult {
  const highReasons: string[] = [];
  const moderateReasons: string[] = [];

  const sys = input.bpSystolic ?? null;
  const dia = input.bpDiastolic ?? null;
  const hb = input.hemoglobin ?? null;
  const age = input.patientAge ?? null;
  const weight = input.weightKg ?? null;
  const symptoms = (input.symptoms ?? '').trim();

  // 1. Blood pressure thresholds (PIH / Pre-eclampsia)
  if ((sys !== null && sys >= 140) || (dia !== null && dia >= 90)) {
    highReasons.push(`Elevated BP (${sys ?? '?'}/${dia ?? '?'} mmHg >= 140/90)`);
  } else if ((sys !== null && sys >= 130) || (dia !== null && dia >= 85)) {
    moderateReasons.push(`Borderline BP (${sys ?? '?'}/${dia ?? '?'} mmHg)`);
  }

  // 2. Hemoglobin thresholds (MoHFW Anaemia Mukt Bharat)
  if (hb !== null && hb > 0) {
    if (hb < 7.0) {
      highReasons.push(`Severe anaemia (Hb ${hb.toFixed(1)} g/dL < 7.0)`);
    } else if (hb < 10.0) {
      if (input.category === 'ANC' && (input.gestationalWeeks ?? 0) >= 28) {
        highReasons.push(`Third-trimester moderate anaemia (Hb ${hb.toFixed(1)} g/dL)`);
      } else {
        moderateReasons.push(`Moderate anaemia (Hb ${hb.toFixed(1)} g/dL < 10.0)`);
      }
    } else if (hb < 11.0 && (input.category === 'ANC' || input.category === 'PNC')) {
      moderateReasons.push(`Mild maternal anaemia (Hb ${hb.toFixed(1)} g/dL < 11.0)`);
    }
  }

  // 3. Age & weight risk factors
  if ((input.category === 'ANC' || input.category === 'PNC') && age !== null && age > 0) {
    if (age < 19) {
      highReasons.push(`Adolescent pregnancy / mother (age ${age} < 19)`);
    } else if (age >= 35) {
      moderateReasons.push(`Advanced maternal age (${age} yrs)`);
    }
  }

  if (input.category === 'ANC' && weight !== null && weight > 0 && weight < 42) {
    moderateReasons.push(`Low maternal weight (${weight.toFixed(1)} kg < 42 kg)`);
  }

  if ((input.category === 'Child Care' || input.category === 'Nutrition') && weight !== null && weight > 0 && weight < 2.5 && (age ?? 1) <= 1) {
    highReasons.push(`Low infant weight (${weight.toFixed(2)} kg < 2.5 kg)`);
  }

  // 4. Symptom danger signs
  if (symptoms) {
    for (const rule of HIGH_RISK_SYMPTOM_PATTERNS) {
      if (rule.pattern.test(symptoms)) {
        highReasons.push(rule.label);
      }
    }
    for (const rule of MODERATE_SYMPTOM_PATTERNS) {
      if (rule.pattern.test(symptoms)) {
        moderateReasons.push(rule.label);
      }
    }
  }

  // Combine edema + borderline/high BP as urgent pre-eclampsia escalation
  if (highReasons.length > 0) {
    const allReasons = [...new Set([...highReasons, ...moderateReasons])];
    return {
      riskLevel: 'high',
      riskReasons: allReasons,
      recommendedAction:
        input.category === 'Child Care' || input.category === 'Nutrition'
          ? 'Immediate PHC Medical Officer referral and danger-sign stabilization; verify immunization and nutrition supplement.'
          : 'Refer to PHC / FRU within 24 hours for Medical Officer evaluation, urine albumin & BP re-check, and high-risk ANC tracking.',
      suggestedFollowUpDays: 2,
    };
  }

  if (moderateReasons.length > 0) {
    return {
      riskLevel: 'moderate',
      riskReasons: [...new Set(moderateReasons)],
      recommendedAction:
        'Ensure daily IFA / nutrition supplementation, dietary counseling with iron-rich foods, and repeat home visit within 7 days.',
      suggestedFollowUpDays: 7,
    };
  }

  return {
    riskLevel: 'normal',
    riskReasons: ['Vitals and reported symptoms within routine NHM parameters'],
    recommendedAction:
      input.category === 'Child Care'
        ? 'Continue age-appropriate breastfeeding/complementary feeding and scheduled UIP immunization.'
        : 'Continue routine IFA & calcium supplementation and schedule next monthly ANC/PNC check-up.',
    suggestedFollowUpDays: 21,
  };
}

export function computeNextVisitDate(visitDateIso: string, followUpDays: number): string {
  const parsed = new Date(`${visitDateIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + followUpDays);
    return fallback.toISOString().slice(0, 10);
  }
  parsed.setUTCDate(parsed.getUTCDate() + followUpDays);
  return parsed.toISOString().slice(0, 10);
}

export function summarizeRegisterMetrics(visits: VisitRecord[]): RegisterSummaryMetrics {
  const totalVisits = visits.length;
  let highRiskCount = 0;
  let moderateRiskCount = 0;
  let normalCount = 0;
  let pendingFollowUps = 0;
  let completedOrReferred = 0;
  let ifaDistributedTotal = 0;
  let visitsReceivingIfa = 0;
  let ancVisitsCount = 0;
  let childVisitsCount = 0;

  for (const v of visits) {
    if (v.riskLevel === 'high') highRiskCount++;
    else if (v.riskLevel === 'moderate') moderateRiskCount++;
    else normalCount++;

    if (v.followUpStatus === 'pending') pendingFollowUps++;
    else completedOrReferred++;

    if (v.ifaTabletsGiven > 0) {
      ifaDistributedTotal += v.ifaTabletsGiven;
      visitsReceivingIfa++;
    }

    if (v.category === 'ANC' || v.category === 'PNC') ancVisitsCount++;
    else childVisitsCount++;
  }

  const ifaCoveragePct = totalVisits > 0 ? Math.round((visitsReceivingIfa / totalVisits) * 100) : 0;

  return {
    totalVisits,
    highRiskCount,
    moderateRiskCount,
    normalCount,
    pendingFollowUps,
    completedOrReferred,
    ifaDistributedTotal,
    ifaCoveragePct,
    ancVisitsCount,
    childVisitsCount,
  };
}

export interface VisitFilters {
  search?: string;
  riskLevel?: RiskLevel | 'all';
  category?: VisitCategory | 'all';
  followUpStatus?: FollowUpStatus | 'all';
}

const RISK_RANK: Record<RiskLevel, number> = {
  high: 3,
  moderate: 2,
  normal: 1,
};

export function filterAndSortVisits(
  visits: VisitRecord[],
  filters: VisitFilters,
  sortBy: 'recent' | 'risk' = 'recent'
): VisitRecord[] {
  const q = (filters.search ?? '').trim().toLowerCase();

  const filtered = visits.filter((v) => {
    if (filters.riskLevel && filters.riskLevel !== 'all' && v.riskLevel !== filters.riskLevel) {
      return false;
    }
    if (filters.category && filters.category !== 'all' && v.category !== filters.category) {
      return false;
    }
    if (
      filters.followUpStatus &&
      filters.followUpStatus !== 'all' &&
      v.followUpStatus !== filters.followUpStatus
    ) {
      return false;
    }
    if (q) {
      const haystack = `${v.patientName} ${v.village} ${v.district} ${v.symptoms} ${v.counselingGiven} ${v.rawTranscript}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (sortBy === 'risk') {
      const diff = RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel];
      if (diff !== 0) return diff;
    }
    const dateCompare = b.visitDate.localeCompare(a.visitDate);
    if (dateCompare !== 0) return dateCompare;
    return b.id - a.id;
  });
}

export function buildBeneficiaryCohorts(visits: VisitRecord[]): BeneficiaryCohort[] {
  const map = new Map<string, VisitRecord[]>();

  for (const visit of visits) {
    const key = `${visit.patientName.trim().toLowerCase()}::${visit.village.trim().toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.push(visit);
    } else {
      map.set(key, [visit]);
    }
  }

  const cohorts: BeneficiaryCohort[] = [];
  for (const [key, group] of map.entries()) {
    const sorted = [...group].sort((a, b) => {
      const d = b.visitDate.localeCompare(a.visitDate);
      return d !== 0 ? d : b.id - a.id;
    });
    const latest = sorted[0];
    let highestRisk: RiskLevel = 'normal';
    for (const v of sorted) {
      if (RISK_RANK[v.riskLevel] > RISK_RANK[highestRisk]) {
        highestRisk = v.riskLevel;
      }
    }
    cohorts.push({
      key,
      patientName: latest.patientName,
      patientAge: latest.patientAge,
      village: latest.village,
      district: latest.district,
      phcName: latest.phcName,
      primaryCategory: latest.category,
      latestVisit: latest,
      visitCount: sorted.length,
      visits: sorted,
      highestRisk,
      pendingFollowUp: sorted.some((v) => v.followUpStatus === 'pending'),
    });
  }

  return cohorts.sort((a, b) => {
    const r = RISK_RANK[b.highestRisk] - RISK_RANK[a.highestRisk];
    if (r !== 0) return r;
    return b.latestVisit.visitDate.localeCompare(a.latestVisit.visitDate);
  });
}

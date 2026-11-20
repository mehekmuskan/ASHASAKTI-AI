import type { VisitRecord } from '../types/health';

export interface VillageHouseholdSummary {
  key: string;
  village: string;
  district: string;
  phcName: string;
  uniqueCitizens: number;
  totalVisits: number;
  highRiskCount: number;
  pendingCount: number;
  ifaTabletsTotal: number;
  lastVisitDate: string;
}

export function summarizeHouseholdsByVillage(visits: VisitRecord[]): VillageHouseholdSummary[] {
  const map = new Map<
    string,
    {
      village: string;
      district: string;
      phcName: string;
      citizens: Set<string>;
      totalVisits: number;
      highRiskCount: number;
      pendingCount: number;
      ifaTabletsTotal: number;
      lastVisitDate: string;
    }
  >();

  for (const v of visits) {
    const key = `${v.village.trim().toLowerCase()}::${v.district.trim().toLowerCase()}`;
    const existing = map.get(key);
    const citizenKey = v.patientName.trim().toLowerCase();
    if (!existing) {
      map.set(key, {
        village: v.village,
        district: v.district,
        phcName: v.phcName,
        citizens: new Set([citizenKey]),
        totalVisits: 1,
        highRiskCount: v.riskLevel === 'high' ? 1 : 0,
        pendingCount: v.followUpStatus === 'pending' ? 1 : 0,
        ifaTabletsTotal: v.ifaTabletsGiven,
        lastVisitDate: v.visitDate,
      });
    } else {
      existing.citizens.add(citizenKey);
      existing.totalVisits += 1;
      if (v.riskLevel === 'high') existing.highRiskCount += 1;
      if (v.followUpStatus === 'pending') existing.pendingCount += 1;
      existing.ifaTabletsTotal += v.ifaTabletsGiven;
      if (v.visitDate > existing.lastVisitDate) existing.lastVisitDate = v.visitDate;
    }
  }

  return Array.from(map.entries())
    .map(([key, row]) => ({
      key,
      village: row.village,
      district: row.district,
      phcName: row.phcName,
      uniqueCitizens: row.citizens.size,
      totalVisits: row.totalVisits,
      highRiskCount: row.highRiskCount,
      pendingCount: row.pendingCount,
      ifaTabletsTotal: row.ifaTabletsTotal,
      lastVisitDate: row.lastVisitDate,
    }))
    .sort((a, b) => b.highRiskCount - a.highRiskCount || b.totalVisits - a.totalVisits);
}

export interface SurveillanceCluster {
  syndrome: string;
  severity: 'high' | 'moderate' | 'watch';
  caseCount: number;
  villages: string[];
  matchedVisits: VisitRecord[];
}

export function summarizeDiseaseSurveillance(visits: VisitRecord[]): SurveillanceCluster[] {
  const clusters: Array<{
    syndrome: string;
    severity: 'high' | 'moderate' | 'watch';
    match: (v: VisitRecord) => boolean;
  }> = [
    {
      syndrome: 'Hypertensive Disorders / PIH',
      severity: 'high',
      match: (v) =>
        (v.bpSystolic !== null && v.bpSystolic >= 130) ||
        (v.bpDiastolic !== null && v.bpDiastolic >= 85) ||
        /(edema|headache|vision|ಊತ|सूजन)/i.test(v.symptoms),
    },
    {
      syndrome: 'Moderate & Severe Anaemia (Hb < 10.0)',
      severity: 'high',
      match: (v) => v.hemoglobin !== null && v.hemoglobin < 10.0,
    },
    {
      syndrome: 'Diarrheal & Acute GI Episodes',
      severity: 'moderate',
      match: (v) => /(diarrh|vomit|ors|zinc|ಭೇದಿ|दस्त|उल्टी)/i.test(`${v.symptoms} ${v.counselingGiven}`),
    },
    {
      syndrome: 'Respiratory / Febrile Symptoms',
      severity: 'watch',
      match: (v) =>
        /(fever|cough|cold|breath|respirat|ಜ್ವರ|ಕೆಮ್ಮು|ಉಸಿರಾಟ|बुखार|खांसी|सांस)/i.test(v.symptoms),
    },
  ];

  return clusters.map((c) => {
    const matchedVisits = visits.filter(c.match);
    const villages = Array.from(new Set(matchedVisits.map((v) => v.village)));
    return {
      syndrome: c.syndrome,
      severity: c.severity,
      caseCount: matchedVisits.length,
      villages,
      matchedVisits,
    };
  });
}

export interface MaternalChildBreakdown {
  maternalVisits: VisitRecord[];
  childVisits: VisitRecord[];
  maternalHighRisk: number;
  childHighOrMod: number;
  averageMaternalHb: number | null;
  maternalIfaTotal: number;
}

export function summarizeMaternalChildSplit(visits: VisitRecord[]): MaternalChildBreakdown {
  const maternalVisits = visits.filter((v) => v.category === 'ANC' || v.category === 'PNC');
  const childVisits = visits.filter((v) => v.category === 'Child Care' || v.category === 'Nutrition');

  const maternalHbValues = maternalVisits
    .map((v) => v.hemoglobin)
    .filter((hb): hb is number => hb !== null && hb > 0);

  const averageMaternalHb =
    maternalHbValues.length > 0
      ? Number((maternalHbValues.reduce((sum, n) => sum + n, 0) / maternalHbValues.length).toFixed(1))
      : null;

  return {
    maternalVisits,
    childVisits,
    maternalHighRisk: maternalVisits.filter((v) => v.riskLevel === 'high').length,
    childHighOrMod: childVisits.filter((v) => v.riskLevel !== 'normal').length,
    averageMaternalHb,
    maternalIfaTotal: maternalVisits.reduce((sum, v) => sum + v.ifaTabletsGiven, 0),
  };
}

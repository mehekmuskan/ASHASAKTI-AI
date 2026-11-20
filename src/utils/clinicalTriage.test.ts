import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessClinicalRisk,
  buildBeneficiaryCohorts,
  computeNextVisitDate,
  filterAndSortVisits,
  summarizeRegisterMetrics,
} from './clinicalTriage';
import type { VisitRecord } from '../types/health';

test('assessClinicalRisk flags gestational hypertension (>=140/90) and edema as high risk', () => {
  const result = assessClinicalRisk({
    category: 'ANC',
    patientAge: 26,
    gestationalWeeks: 30,
    bpSystolic: 146,
    bpDiastolic: 94,
    hemoglobin: 10.6,
    symptoms: 'Pedal edema and headache',
  });

  assert.equal(result.riskLevel, 'high');
  assert.equal(result.suggestedFollowUpDays, 2);
  assert.ok(result.riskReasons.some((r) => r.includes('Elevated BP')));
  assert.ok(result.riskReasons.some((r) => r.includes('edema')));
});

test('assessClinicalRisk flags severe anaemia (Hb < 7.0) as high risk', () => {
  const result = assessClinicalRisk({
    category: 'ANC',
    patientAge: 24,
    gestationalWeeks: 22,
    bpSystolic: 112,
    bpDiastolic: 74,
    hemoglobin: 6.6,
    symptoms: 'Dizziness and fatigue',
  });

  assert.equal(result.riskLevel, 'high');
  assert.ok(result.riskReasons.some((r) => r.includes('Severe anaemia')));
});

test('assessClinicalRisk flags moderate anaemia in early trimester as moderate risk', () => {
  const result = assessClinicalRisk({
    category: 'ANC',
    patientAge: 23,
    gestationalWeeks: 18,
    bpSystolic: 118,
    bpDiastolic: 76,
    hemoglobin: 9.2,
    symptoms: 'Mild tiredness',
  });

  assert.equal(result.riskLevel, 'moderate');
  assert.equal(result.suggestedFollowUpDays, 7);
});

test('assessClinicalRisk returns normal for healthy ANC parameters', () => {
  const result = assessClinicalRisk({
    category: 'ANC',
    patientAge: 25,
    gestationalWeeks: 20,
    bpSystolic: 114,
    bpDiastolic: 72,
    hemoglobin: 11.8,
    weightKg: 54,
    symptoms: 'None',
  });

  assert.equal(result.riskLevel, 'normal');
  assert.equal(result.suggestedFollowUpDays, 21);
});

test('assessClinicalRisk returns normal for healthy child feeding well', () => {
  const result = assessClinicalRisk({
    category: 'Child Care',
    patientAge: 1,
    weightKg: 8.2,
    symptoms: 'Active and feeding well',
  });

  assert.equal(result.riskLevel, 'normal');
});

test('assessClinicalRisk detects Kannada high-risk symptom keywords', () => {
  const result = assessClinicalRisk({
    category: 'ANC',
    patientAge: 24,
    bpSystolic: 120,
    bpDiastolic: 80,
    hemoglobin: 11.2,
    symptoms: 'ಕಾಲು ಊತ ಮತ್ತು ತೀವ್ರ ತಲೆನೋವು ಇದೆ',
  });

  assert.equal(result.riskLevel, 'high');
  assert.ok(result.riskReasons.some((r) => r.includes('edema')));
});

test('computeNextVisitDate adds days deterministically in UTC', () => {
  assert.equal(computeNextVisitDate('2026-11-19', 2), '2026-11-21');
  assert.equal(computeNextVisitDate('2026-11-29', 7), '2026-12-06');
});

const SAMPLE_VISITS: VisitRecord[] = [
  {
    id: 1,
    workerId: 1,
    patientName: 'Lakshmi Devi',
    patientAge: 26,
    village: 'Hosahalli',
    phcName: 'Doddaballapura PHC',
    district: 'Bengaluru Rural',
    category: 'ANC',
    gestationalWeeks: 30,
    bpSystolic: 145,
    bpDiastolic: 95,
    hemoglobin: 8.8,
    weightKg: 52,
    symptoms: 'Pedal edema',
    counselingGiven: 'Urgent PHC referral',
    ifaTabletsGiven: 30,
    immunizationStatus: 'TT-2 Done',
    rawTranscript: 'BP 145/95',
    language: 'kn',
    riskLevel: 'high',
    riskReasons: ['Elevated BP'],
    recommendedAction: 'Refer to PHC',
    followUpStatus: 'pending',
    visitDate: '2026-11-18',
    nextVisitDate: '2026-11-20',
    createdAt: '2026-11-18T10:00:00Z',
  },
  {
    id: 2,
    workerId: 1,
    patientName: 'Anitha Kumari',
    patientAge: 23,
    village: 'Madhure',
    phcName: 'Doddaballapura PHC',
    district: 'Bengaluru Rural',
    category: 'Child Care',
    gestationalWeeks: null,
    bpSystolic: null,
    bpDiastolic: null,
    hemoglobin: null,
    weightKg: 7.4,
    symptoms: 'Healthy',
    counselingGiven: 'Breastfeeding and Penta-3 counseling',
    ifaTabletsGiven: 0,
    immunizationStatus: 'Penta-3 Completed',
    rawTranscript: 'Child doing well',
    language: 'en',
    riskLevel: 'normal',
    riskReasons: ['Normal'],
    recommendedAction: 'Routine schedule',
    followUpStatus: 'completed',
    visitDate: '2026-11-17',
    nextVisitDate: '2026-12-08',
    createdAt: '2026-11-17T09:00:00Z',
  },
  {
    id: 3,
    workerId: 1,
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
    weightKg: 51,
    symptoms: 'Mild fatigue',
    counselingGiven: 'IFA daily',
    ifaTabletsGiven: 30,
    immunizationStatus: 'TT-1 Done',
    rawTranscript: 'Earlier ANC check',
    language: 'kn',
    riskLevel: 'moderate',
    riskReasons: ['Moderate anaemia'],
    recommendedAction: 'Weekly follow-up',
    followUpStatus: 'completed',
    visitDate: '2026-10-20',
    nextVisitDate: '2026-10-27',
    createdAt: '2026-10-20T09:00:00Z',
  },
];

test('summarizeRegisterMetrics aggregates counts and IFA distribution accurately', () => {
  const metrics = summarizeRegisterMetrics(SAMPLE_VISITS);
  assert.equal(metrics.totalVisits, 3);
  assert.equal(metrics.highRiskCount, 1);
  assert.equal(metrics.moderateRiskCount, 1);
  assert.equal(metrics.normalCount, 1);
  assert.equal(metrics.pendingFollowUps, 1);
  assert.equal(metrics.ifaDistributedTotal, 60);
  assert.equal(metrics.ifaCoveragePct, 67);
});

test('filterAndSortVisits filters by risk, search text, and sorts correctly', () => {
  const highOnly = filterAndSortVisits(SAMPLE_VISITS, { riskLevel: 'high' });
  assert.equal(highOnly.length, 1);
  assert.equal(highOnly[0].patientName, 'Lakshmi Devi');

  const searchMadhure = filterAndSortVisits(SAMPLE_VISITS, { search: 'madhure' });
  assert.equal(searchMadhure.length, 1);
  assert.equal(searchMadhure[0].patientName, 'Anitha Kumari');
});

test('buildBeneficiaryCohorts groups repeat visits by patient and village', () => {
  const cohorts = buildBeneficiaryCohorts(SAMPLE_VISITS);
  assert.equal(cohorts.length, 2);
  assert.equal(cohorts[0].patientName, 'Lakshmi Devi');
  assert.equal(cohorts[0].visitCount, 2);
  assert.equal(cohorts[0].highestRisk, 'high');
  assert.equal(cohorts[0].pendingFollowUp, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type { VisitRecord } from '../types/health';
import {
  summarizeDiseaseSurveillance,
  summarizeHouseholdsByVillage,
  summarizeMaternalChildSplit,
} from './populationMetrics';

const MOCK_VISITS: VisitRecord[] = [
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
    bpSystolic: 146,
    bpDiastolic: 94,
    hemoglobin: 8.8,
    weightKg: 53,
    symptoms: 'Pedal edema and headache',
    counselingGiven: 'PHC referral',
    ifaTabletsGiven: 30,
    immunizationStatus: 'TT-2',
    rawTranscript: '',
    language: 'kn',
    riskLevel: 'high',
    riskReasons: ['Elevated BP'],
    recommendedAction: 'Refer',
    followUpStatus: 'pending',
    visitDate: '2026-11-18',
    nextVisitDate: '2026-11-20',
    createdAt: '2026-11-18',
  },
  {
    id: 2,
    workerId: 1,
    patientName: 'Lakshmi Devi',
    patientAge: 26,
    village: 'Hosahalli',
    phcName: 'Doddaballapura PHC',
    district: 'Bengaluru Rural',
    category: 'ANC',
    gestationalWeeks: 26,
    bpSystolic: 120,
    bpDiastolic: 80,
    hemoglobin: 10.2,
    weightKg: 52,
    symptoms: 'None',
    counselingGiven: 'IFA',
    ifaTabletsGiven: 30,
    immunizationStatus: 'TT-1',
    rawTranscript: '',
    language: 'kn',
    riskLevel: 'moderate',
    riskReasons: ['Mild anaemia'],
    recommendedAction: 'Weekly follow-up',
    followUpStatus: 'completed',
    visitDate: '2026-10-20',
    nextVisitDate: '2026-10-27',
    createdAt: '2026-10-20',
  },
  {
    id: 3,
    workerId: 2,
    patientName: 'Aarav',
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
    symptoms: 'Recurrent diarrhea episode',
    counselingGiven: 'ORS + Zinc',
    ifaTabletsGiven: 0,
    immunizationStatus: 'MR-1',
    rawTranscript: '',
    language: 'hi',
    riskLevel: 'moderate',
    riskReasons: ['Moderate anaemia'],
    recommendedAction: 'ORS',
    followUpStatus: 'pending',
    visitDate: '2026-11-14',
    nextVisitDate: '2026-11-21',
    createdAt: '2026-11-14',
  },
];

test('summarizeHouseholdsByVillage groups visits and deduplicates citizens per village', () => {
  const result = summarizeHouseholdsByVillage(MOCK_VISITS);
  assert.equal(result.length, 2);
  assert.equal(result[0].village, 'Hosahalli');
  assert.equal(result[0].uniqueCitizens, 1);
  assert.equal(result[0].totalVisits, 2);
  assert.equal(result[0].ifaTabletsTotal, 60);
});

test('summarizeDiseaseSurveillance classifies PIH, anaemia, and diarrheal episodes', () => {
  const clusters = summarizeDiseaseSurveillance(MOCK_VISITS);
  const pih = clusters.find((c) => c.syndrome.includes('Hypertensive'))!;
  const anaemia = clusters.find((c) => c.syndrome.includes('Anaemia'))!;
  const gi = clusters.find((c) => c.syndrome.includes('Diarrheal'))!;

  assert.equal(pih.caseCount, 1);
  assert.equal(anaemia.caseCount, 2);
  assert.equal(gi.caseCount, 1);
});

test('summarizeMaternalChildSplit computes ANC/PNC and Child Care totals and mean Hb', () => {
  const split = summarizeMaternalChildSplit(MOCK_VISITS);
  assert.equal(split.maternalVisits.length, 2);
  assert.equal(split.childVisits.length, 1);
  assert.equal(split.averageMaternalHb, 9.5);
  assert.equal(split.maternalIfaTotal, 60);
});

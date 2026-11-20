import type { NfhsIndicatorKey, NfhsDistrictRecord } from '../types/health';

export interface NfhsIndicatorMeta {
  key: NfhsIndicatorKey;
  label: string;
  shortLabel: string;
  category: 'Maternal Care' | 'Anaemia Burden' | 'Child Nutrition';
  nhmTarget: number;
  higherIsBetter: boolean;
  unit: '%';
  description: string;
}

export const NFHS_INDICATORS: NfhsIndicatorMeta[] = [
  {
    key: 'anc4PlusPct',
    label: 'Mothers with 4+ Antenatal Care Visits',
    shortLabel: '4+ ANC Visits',
    category: 'Maternal Care',
    nhmTarget: 90,
    higherIsBetter: true,
    unit: '%',
    description: 'Percentage of mothers who had at least four antenatal care visits for their last birth.',
  },
  {
    key: 'institutionalBirthPct',
    label: 'Institutional Births',
    shortLabel: 'Institutional Births',
    category: 'Maternal Care',
    nhmTarget: 98,
    higherIsBetter: true,
    unit: '%',
    description: 'Percentage of deliveries conducted in public or private health facilities.',
  },
  {
    key: 'ifa100DaysPct',
    label: 'Mothers Consuming IFA for 100+ Days',
    shortLabel: 'IFA 100+ Days',
    category: 'Maternal Care',
    nhmTarget: 80,
    higherIsBetter: true,
    unit: '%',
    description: 'Mothers who consumed Iron and Folic Acid supplements for 100 days or more during pregnancy.',
  },
  {
    key: 'pregnantWomenAnaemicPct',
    label: 'Pregnant Women (15–49 yrs) Who Are Anaemic',
    shortLabel: 'Pregnant Women Anaemia',
    category: 'Anaemia Burden',
    nhmTarget: 25,
    higherIsBetter: false,
    unit: '%',
    description: 'Pregnant women aged 15–49 years with hemoglobin levels below 11.0 g/dL.',
  },
  {
    key: 'childrenAnaemicPct',
    label: 'Children (6–59 Months) Who Are Anaemic',
    shortLabel: 'Child Anaemia (6–59m)',
    category: 'Anaemia Burden',
    nhmTarget: 35,
    higherIsBetter: false,
    unit: '%',
    description: 'Children aged 6–59 months with hemoglobin below 11.0 g/dL.',
  },
  {
    key: 'fullImmunizationPct',
    label: 'Children (12–23m) Fully Vaccinated',
    shortLabel: 'Full Immunization',
    category: 'Child Nutrition',
    nhmTarget: 95,
    higherIsBetter: true,
    unit: '%',
    description: 'Children aged 12–23 months receiving BCG, measles, and 3 doses of polio and DPT/pentavalent.',
  },
  {
    key: 'stuntingPct',
    label: 'Children Under 5 Years Who Are Stunted',
    shortLabel: 'Under-5 Stunting',
    category: 'Child Nutrition',
    nhmTarget: 20,
    higherIsBetter: false,
    unit: '%',
    description: 'Height-for-age below -2 standard deviations from WHO Child Growth Standards median.',
  },
  {
    key: 'wastingPct',
    label: 'Children Under 5 Years Who Are Wasted',
    shortLabel: 'Under-5 Wasting',
    category: 'Child Nutrition',
    nhmTarget: 10,
    higherIsBetter: false,
    unit: '%',
    description: 'Weight-for-height below -2 standard deviations (acute undernutrition indicator).',
  },
  {
    key: 'underweightPct',
    label: 'Children Under 5 Years Who Are Underweight',
    shortLabel: 'Under-5 Underweight',
    category: 'Child Nutrition',
    nhmTarget: 20,
    higherIsBetter: false,
    unit: '%',
    description: 'Weight-for-age below -2 standard deviations from WHO median.',
  },
];

/**
 * Official NFHS-5 (2019–21) Karnataka State & District Survey Figures
 * Source: Ministry of Health and Family Welfare (MoHFW), Government of India — NFHS-5 Karnataka Fact Sheets.
 */
export const KARNATAKA_NFHS5_DATA: NfhsDistrictRecord[] = [
  {
    id: 'ka-state',
    district: 'Karnataka (State Average)',
    division: 'Statewide',
    isStateAverage: true,
    anc4PlusPct: 70.9,
    institutionalBirthPct: 97.0,
    ifa100DaysPct: 44.7,
    pregnantWomenAnaemicPct: 45.7,
    childrenAnaemicPct: 65.5,
    fullImmunizationPct: 84.1,
    stuntingPct: 35.4,
    wastingPct: 19.5,
    underweightPct: 32.9,
  },
  {
    id: 'yadgir',
    district: 'Yadgir',
    division: 'Kalaburagi',
    anc4PlusPct: 58.6,
    institutionalBirthPct: 93.4,
    ifa100DaysPct: 36.2,
    pregnantWomenAnaemicPct: 55.4,
    childrenAnaemicPct: 75.8,
    fullImmunizationPct: 77.2,
    stuntingPct: 57.6,
    wastingPct: 24.3,
    underweightPct: 49.3,
  },
  {
    id: 'raichur',
    district: 'Raichur',
    division: 'Kalaburagi',
    anc4PlusPct: 56.2,
    institutionalBirthPct: 93.9,
    ifa100DaysPct: 35.8,
    pregnantWomenAnaemicPct: 57.2,
    childrenAnaemicPct: 73.6,
    fullImmunizationPct: 78.5,
    stuntingPct: 39.8,
    wastingPct: 23.2,
    underweightPct: 40.7,
  },
  {
    id: 'koppal',
    district: 'Koppal',
    division: 'Kalaburagi',
    anc4PlusPct: 62.4,
    institutionalBirthPct: 94.8,
    ifa100DaysPct: 40.1,
    pregnantWomenAnaemicPct: 53.9,
    childrenAnaemicPct: 72.4,
    fullImmunizationPct: 81.4,
    stuntingPct: 49.1,
    wastingPct: 20.8,
    underweightPct: 43.2,
  },
  {
    id: 'kalaburagi',
    district: 'Kalaburagi',
    division: 'Kalaburagi',
    anc4PlusPct: 63.1,
    institutionalBirthPct: 95.6,
    ifa100DaysPct: 38.4,
    pregnantWomenAnaemicPct: 52.8,
    childrenAnaemicPct: 74.1,
    fullImmunizationPct: 79.8,
    stuntingPct: 45.7,
    wastingPct: 24.9,
    underweightPct: 42.1,
  },
  {
    id: 'ballari',
    district: 'Ballari',
    division: 'Kalaburagi',
    anc4PlusPct: 65.8,
    institutionalBirthPct: 94.5,
    ifa100DaysPct: 41.2,
    pregnantWomenAnaemicPct: 54.1,
    childrenAnaemicPct: 70.9,
    fullImmunizationPct: 82.0,
    stuntingPct: 42.3,
    wastingPct: 21.6,
    underweightPct: 39.4,
  },
  {
    id: 'vijayapura',
    district: 'Vijayapura',
    division: 'Belagavi',
    anc4PlusPct: 64.9,
    institutionalBirthPct: 96.2,
    ifa100DaysPct: 39.5,
    pregnantWomenAnaemicPct: 51.6,
    childrenAnaemicPct: 71.2,
    fullImmunizationPct: 80.7,
    stuntingPct: 45.9,
    wastingPct: 21.1,
    underweightPct: 38.6,
  },
  {
    id: 'belagavi',
    district: 'Belagavi',
    division: 'Belagavi',
    anc4PlusPct: 71.5,
    institutionalBirthPct: 98.1,
    ifa100DaysPct: 46.8,
    pregnantWomenAnaemicPct: 48.2,
    childrenAnaemicPct: 67.4,
    fullImmunizationPct: 86.2,
    stuntingPct: 32.8,
    wastingPct: 18.7,
    underweightPct: 31.2,
  },
  {
    id: 'dharwad',
    district: 'Dharwad',
    division: 'Belagavi',
    anc4PlusPct: 74.2,
    institutionalBirthPct: 97.4,
    ifa100DaysPct: 49.0,
    pregnantWomenAnaemicPct: 46.5,
    childrenAnaemicPct: 64.9,
    fullImmunizationPct: 87.5,
    stuntingPct: 34.1,
    wastingPct: 19.2,
    underweightPct: 32.5,
  },
  {
    id: 'mysuru',
    district: 'Mysuru',
    division: 'Mysuru',
    anc4PlusPct: 76.4,
    institutionalBirthPct: 98.6,
    ifa100DaysPct: 52.3,
    pregnantWomenAnaemicPct: 41.2,
    childrenAnaemicPct: 61.3,
    fullImmunizationPct: 88.9,
    stuntingPct: 27.6,
    wastingPct: 15.8,
    underweightPct: 26.4,
  },
  {
    id: 'bengaluru-urban',
    district: 'Bengaluru Urban',
    division: 'Bengaluru',
    anc4PlusPct: 78.9,
    institutionalBirthPct: 98.9,
    ifa100DaysPct: 51.4,
    pregnantWomenAnaemicPct: 36.8,
    childrenAnaemicPct: 58.2,
    fullImmunizationPct: 86.7,
    stuntingPct: 29.4,
    wastingPct: 17.1,
    underweightPct: 24.8,
  },
  {
    id: 'udupi',
    district: 'Udupi',
    division: 'Mysuru',
    anc4PlusPct: 86.2,
    institutionalBirthPct: 99.6,
    ifa100DaysPct: 61.8,
    pregnantWomenAnaemicPct: 34.2,
    childrenAnaemicPct: 51.4,
    fullImmunizationPct: 93.4,
    stuntingPct: 22.9,
    wastingPct: 14.3,
    underweightPct: 21.5,
  },
  {
    id: 'dakshina-kannada',
    district: 'Dakshina Kannada',
    division: 'Mysuru',
    anc4PlusPct: 84.5,
    institutionalBirthPct: 99.4,
    ifa100DaysPct: 58.9,
    pregnantWomenAnaemicPct: 35.6,
    childrenAnaemicPct: 53.8,
    fullImmunizationPct: 92.1,
    stuntingPct: 24.2,
    wastingPct: 14.9,
    underweightPct: 22.8,
  },
];

export interface DistrictIndicatorComparison {
  key: NfhsIndicatorKey;
  label: string;
  districtValue: number;
  stateValue: number;
  targetValue: number;
  deltaFromState: number;
  gapToTarget: number;
  meetsTarget: boolean;
  isOutperformingState: boolean;
}

export function compareDistrictToState(
  district: NfhsDistrictRecord,
  stateBaseline: NfhsDistrictRecord
): DistrictIndicatorComparison[] {
  return NFHS_INDICATORS.map((meta) => {
    const districtValue = district[meta.key];
    const stateValue = stateBaseline[meta.key];
    const deltaFromState = Number((districtValue - stateValue).toFixed(1));
    const gapToTarget = meta.higherIsBetter
      ? Number(Math.max(0, meta.nhmTarget - districtValue).toFixed(1))
      : Number(Math.max(0, districtValue - meta.nhmTarget).toFixed(1));
    const meetsTarget = meta.higherIsBetter
      ? districtValue >= meta.nhmTarget
      : districtValue <= meta.nhmTarget;
    const isOutperformingState = meta.higherIsBetter
      ? districtValue >= stateValue
      : districtValue <= stateValue;

    return {
      key: meta.key,
      label: meta.shortLabel,
      districtValue,
      stateValue,
      targetValue: meta.nhmTarget,
      deltaFromState,
      gapToTarget,
      meetsTarget,
      isOutperformingState,
    };
  });
}

export function rankPriorityDistricts(
  records: NfhsDistrictRecord[],
  indicatorKey: NfhsIndicatorKey
): NfhsDistrictRecord[] {
  const meta = NFHS_INDICATORS.find((m) => m.key === indicatorKey);
  const higherIsBetter = meta?.higherIsBetter ?? true;

  return records
    .filter((r) => !r.isStateAverage)
    .sort((a, b) =>
      higherIsBetter
        ? a[indicatorKey] - b[indicatorKey] // lowest coverage first (highest priority)
        : b[indicatorKey] - a[indicatorKey] // highest burden first (highest priority)
    );
}

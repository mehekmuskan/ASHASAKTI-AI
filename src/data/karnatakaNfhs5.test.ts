import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareDistrictToState,
  KARNATAKA_NFHS5_DATA,
  rankPriorityDistricts,
} from './karnatakaNfhs5';

test('compareDistrictToState computes state delta and NHM target gap accurately', () => {
  const state = KARNATAKA_NFHS5_DATA.find((d) => d.isStateAverage)!;
  const yadgir = KARNATAKA_NFHS5_DATA.find((d) => d.id === 'yadgir')!;

  const comparison = compareDistrictToState(yadgir, state);
  const stunting = comparison.find((c) => c.key === 'stuntingPct')!;
  const anc4 = comparison.find((c) => c.key === 'anc4PlusPct')!;

  assert.equal(stunting.districtValue, 57.6);
  assert.equal(stunting.stateValue, 35.4);
  assert.equal(stunting.deltaFromState, 22.2);
  assert.equal(stunting.isOutperformingState, false);
  assert.equal(stunting.meetsTarget, false);

  assert.equal(anc4.isOutperformingState, false);
  assert.equal(anc4.gapToTarget, 31.4);
});

test('rankPriorityDistricts places highest burden / lowest coverage districts first', () => {
  const rankedAnaemia = rankPriorityDistricts(KARNATAKA_NFHS5_DATA, 'pregnantWomenAnaemicPct');
  assert.equal(rankedAnaemia[0].district, 'Raichur');
  assert.equal(rankedAnaemia[rankedAnaemia.length - 1].district, 'Udupi');

  const rankedAnc = rankPriorityDistricts(KARNATAKA_NFHS5_DATA, 'anc4PlusPct');
  assert.equal(rankedAnc[0].district, 'Raichur');
  assert.equal(rankedAnc[rankedAnc.length - 1].district, 'Udupi');
});

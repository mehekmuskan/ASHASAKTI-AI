import { CheckCircle2, Loader2, ShieldAlert, Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BeneficiaryCohort, FollowUpStatus, VisitRecord } from '../types/health';
import { buildBeneficiaryCohorts } from '../utils/clinicalTriage';
import { FollowUpStatusText, RiskStatusText } from './RiskLabel';

interface FollowUpsViewProps {
  visits: VisitRecord[];
  initialFilter?: 'all' | 'pending' | 'high' | 'completed';
  initialCohortKey?: string | null;
  heading?: string;
  onUpdateFollowUp: (visitId: number, status: FollowUpStatus, counseling?: string) => Promise<void>;
}

export function FollowUpsView({
  visits,
  initialFilter = 'all',
  initialCohortKey = null,
  heading = 'Beneficiary Cohorts & High-Risk Follow-ups',
  onUpdateFollowUp,
}: FollowUpsViewProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'high' | 'completed'>(initialFilter);
  const [selectedKey, setSelectedKey] = useState<string | null>(initialCohortKey);
  const [noteDraft, setNoteDraft] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const cohorts = useMemo(() => buildBeneficiaryCohorts(visits), [visits]);

  const filteredCohorts = useMemo(() => {
    return cohorts.filter((c) => {
      if (filter === 'pending') return c.pendingFollowUp;
      if (filter === 'high') return c.highestRisk === 'high';
      if (filter === 'completed') return !c.pendingFollowUp;
      return true;
    });
  }, [cohorts, filter]);

  const activeCohort: BeneficiaryCohort | null = useMemo(() => {
    if (filteredCohorts.length === 0) return null;
    const preferredKey = selectedKey ?? initialCohortKey;
    if (preferredKey) {
      const found = filteredCohorts.find((c) => c.key === preferredKey);
      if (found) return found;
    }
    return filteredCohorts[0];
  }, [filteredCohorts, selectedKey, initialCohortKey]);

  async function handleSpeakCarePlan(cohort: BeneficiaryCohort) {
    setIsSpeaking(true);
    try {
      const latest = cohort.latestVisit;
      const text = `Care plan for ${cohort.patientName}, age ${cohort.patientAge}, from ${cohort.village}. Highest risk level: ${cohort.highestRisk}. Latest assessment: ${latest.riskReasons.join(', ')}. Recommended action: ${latest.recommendedAction}`;
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok && data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        await audio.play();
      }
    } finally {
      setIsSpeaking(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {heading}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Longitudinal mother and child tracking grouped by beneficiary &amp; village
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-full">
          {(
            [
              { id: 'all', label: 'All Cohorts' },
              { id: 'pending', label: 'Pending Due' },
              { id: 'high', label: 'High Risk' },
              { id: 'completed', label: 'Resolved' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {filteredCohorts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-slate-900">No beneficiary cohorts match this filter</p>
          <p className="text-xs text-slate-500 mt-1">
            Switch to All Cohorts or log a new home visit in Field Register.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cohort List */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
            {filteredCohorts.map((cohort) => {
              const isSelected = activeCohort?.key === cohort.key;
              return (
                <button
                  key={cohort.key}
                  type="button"
                  onClick={() => {
                    setSelectedKey(cohort.key);
                    setNoteDraft(cohort.latestVisit.counselingGiven || '');
                  }}
                  className={`w-full text-left px-4 py-3.5 transition-colors flex items-start justify-between gap-3 ${
                    isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {cohort.patientName}
                      </span>
                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        {cohort.patientAge}y
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {cohort.village}, {cohort.district} · {cohort.visitCount} visit
                      {cohort.visitCount > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-slate-600 truncate">
                      {cohort.latestVisit.symptoms || 'Routine check'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <RiskStatusText level={cohort.highestRisk} />
                    <span className="block text-[11px] font-mono tabular-nums text-slate-400">
                      Due {cohort.latestVisit.nextVisitDate}
                    </span>
                  </div>
                </button>
              );
            })}
          </section>

          {/* Cohort Care Plan & Longitudinal Timeline */}
          {activeCohort && (
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {activeCohort.patientName}
                    </h3>
                    <RiskStatusText level={activeCohort.highestRisk} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Age {activeCohort.patientAge} yrs · {activeCohort.village}, {activeCohort.district} ·{' '}
                    {activeCohort.phcName}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSpeaking}
                  onClick={() => handleSpeakCarePlan(activeCohort)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isSpeaking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                  )}
                  Speak Care Plan
                </button>
              </div>

              {/* Latest Triage Guidance */}
              <div className="pb-4 border-b border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900">NHM Care Plan &amp; Referral Guidance</span>
                  <FollowUpStatusText status={activeCohort.latestVisit.followUpStatus} />
                </div>
                <p className="text-xs text-slate-700">
                  <span className="font-medium">Risk Triggers: </span>
                  {activeCohort.latestVisit.riskReasons.join(' · ')}
                </p>
                <p className="text-xs text-slate-700">
                  <span className="font-medium">Action: </span>
                  {activeCohort.latestVisit.recommendedAction}
                </p>
              </div>

              {/* Update Follow-up Status & Note */}
              <div className="space-y-3">
                <label htmlFor="cohort-counseling-note" className="block text-xs font-medium text-slate-700">
                  Follow-up Note / Referral Remarks
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    id="cohort-counseling-note"
                    type="text"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder={activeCohort.latestVisit.counselingGiven || 'Add PHC referral slip number or home visit update...'}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateFollowUp(
                          activeCohort.latestVisit.id,
                          'referred',
                          noteDraft.trim() || activeCohort.latestVisit.counselingGiven
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      Refer to PHC
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateFollowUp(
                          activeCohort.latestVisit.id,
                          'completed',
                          noteDraft.trim() || activeCohort.latestVisit.counselingGiven
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Mark Completed
                    </button>
                  </div>
                </div>
              </div>

              {/* Longitudinal Visit History */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-semibold text-slate-700 mb-3">
                  Longitudinal Visit History ({activeCohort.visitCount})
                </h4>
                <div className="divide-y divide-slate-200">
                  {activeCohort.visits.map((v) => (
                    <div key={v.id} className="py-3 first:pt-0 last:pb-0 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono tabular-nums font-semibold text-slate-900">
                            {v.visitDate}
                          </span>
                          <span className="text-slate-500">{v.category}</span>
                          <RiskStatusText level={v.riskLevel} />
                        </div>
                        <FollowUpStatusText status={v.followUpStatus} />
                      </div>

                      <div className="flex flex-wrap gap-4 font-mono tabular-nums text-slate-700">
                        <span>
                          BP: {v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic} mmHg` : '—'}
                        </span>
                        <span>Hb: {v.hemoglobin !== null ? `${v.hemoglobin.toFixed(1)} g/dL` : '—'}</span>
                        <span>Weight: {v.weightKg !== null ? `${v.weightKg.toFixed(1)} kg` : '—'}</span>
                        <span>IFA: {v.ifaTabletsGiven} tabs</span>
                      </div>

                      <p className="text-slate-600">{v.counselingGiven || v.symptoms}</p>
                      {v.rawTranscript && (
                        <p className="text-slate-400 italic truncate" title={v.rawTranscript}>
                          Note: &ldquo;{v.rawTranscript}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

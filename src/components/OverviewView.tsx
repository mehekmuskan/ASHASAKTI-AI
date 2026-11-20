import { ArrowRight, CheckCircle2, ClipboardPlus, ExternalLink } from 'lucide-react';
import { KARNATAKA_NFHS5_DATA, rankPriorityDistricts } from '../data/karnatakaNfhs5';
import type { FollowUpStatus, VisitRecord } from '../types/health';
import { summarizeRegisterMetrics } from '../utils/clinicalTriage';
import { FollowUpStatusText, RiskStatusText } from './RiskLabel';

interface OverviewViewProps {
  visits: VisitRecord[];
  onNavigateRegister: () => void;
  onNavigateNfhs: (districtId?: string) => void;
  onNavigateFollowUps: () => void;
  onUpdateFollowUp: (visitId: number, status: FollowUpStatus) => Promise<void>;
}

export function OverviewView({
  visits,
  onNavigateRegister,
  onNavigateNfhs,
  onNavigateFollowUps,
  onUpdateFollowUp,
}: OverviewViewProps) {
  const metrics = summarizeRegisterMetrics(visits);
  const priorityQueue = visits
    .filter((v) => v.followUpStatus === 'pending' && (v.riskLevel === 'high' || v.riskLevel === 'moderate'))
    .slice(0, 5);

  const recentVisits = visits.slice(0, 6);
  const stateBaseline = KARNATAKA_NFHS5_DATA.find((d) => d.isStateAverage)!;
  const topAnaemiaDistricts = rankPriorityDistricts(
    KARNATAKA_NFHS5_DATA,
    'pregnantWomenAnaemicPct'
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <section aria-label="Field register summary metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Visits Logged</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-slate-900">
            {metrics.totalVisits}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {metrics.ancVisitsCount} Maternal · {metrics.childVisitsCount} Child &amp; Nutrition
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">High-Risk Pregnancies &amp; Infants</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-red-700">
            {metrics.highRiskCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {metrics.moderateRiskCount} Moderate Risk · {metrics.normalCount} Routine
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Pending Follow-ups Due</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-amber-700">
            {metrics.pendingFollowUps}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {metrics.completedOrReferred} Completed or PHC Referred
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">IFA Distribution Coverage</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-teal-800">
            {metrics.ifaCoveragePct}%
          </p>
          <p className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {metrics.ifaDistributedTotal} tablets issued across visits
          </p>
        </div>
      </section>

      {/* Main 2-Column Operational Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Priority High-Risk Follow-up Queue */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl flex flex-col">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Priority Follow-up Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                High &amp; moderate risk cases awaiting home re-visit or PHC referral confirmation
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateFollowUps}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap shrink-0"
            >
              View All Cohorts
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {priorityQueue.length === 0 ? (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-900">All flagged follow-ups resolved</p>
              <p className="text-xs text-slate-500 mt-1">
                No pending high or moderate risk visits remain in the queue.
              </p>
              <button
                type="button"
                onClick={onNavigateRegister}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
              >
                <ClipboardPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Log New Visit
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {priorityQueue.map((visit) => (
                <div
                  key={visit.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm font-semibold text-slate-900">
                        {visit.patientName}
                      </span>
                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        {visit.patientAge}y · {visit.village}, {visit.district}
                      </span>
                      <RiskStatusText level={visit.riskLevel} />
                    </div>
                    <p className="text-xs text-slate-600">
                      {visit.riskReasons[0] || visit.symptoms}
                      {visit.bpSystolic && visit.bpDiastolic
                        ? ` · BP ${visit.bpSystolic}/${visit.bpDiastolic} mmHg`
                        : ''}
                      {visit.hemoglobin !== null ? ` · Hb ${visit.hemoglobin.toFixed(1)} g/dL` : ''}
                    </p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      Due by {visit.nextVisitDate} · {visit.category}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateFollowUp(visit.id, 'referred')}
                      className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap"
                    >
                      Mark Referred
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateFollowUp(visit.id, 'completed')}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Karnataka NFHS-5 Priority District Spotlight */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Karnataka Anaemia Hotspots
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                NFHS-5 Pregnant Women Anaemia (%) vs {stateBaseline.pregnantWomenAnaemicPct}% State Avg
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateNfhs('raichur')}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap shrink-0"
            >
              Explore
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="p-5 space-y-4 flex-1">
            {topAnaemiaDistricts.map((row) => {
              const delta = (row.pregnantWomenAnaemicPct - stateBaseline.pregnantWomenAnaemicPct).toFixed(1);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onNavigateNfhs(row.id)}
                  className="w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-md"
                >
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-800 group-hover:text-teal-800 transition-colors">
                      {row.district}
                      <span className="text-slate-400 font-normal"> · {row.division}</span>
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {row.pregnantWomenAnaemicPct}%
                      <span className="text-red-700 font-normal ml-1.5">(+{delta}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-teal-700 rounded-full transition-all"
                      style={{ width: `${Math.min(100, row.pregnantWomenAnaemicPct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>NHM Anaemia Mukt Bharat Target: &le;25%</span>
            <span className="font-mono tabular-nums font-medium text-slate-800">
              KA Avg: {stateBaseline.pregnantWomenAnaemicPct}%
            </span>
          </div>
        </section>
      </div>

      {/* Recent Field Visits Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Field Register Entries</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest recorded Kannada, Hindi, and English home visits
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateRegister}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap"
          >
            Open Full Register
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Beneficiary</th>
                <th className="py-2.5 px-4">Village / District</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">BP (mmHg)</th>
                <th className="py-2.5 px-4 text-right">Hb (g/dL)</th>
                <th className="py-2.5 px-4">Risk</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {recentVisits.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                    {v.visitDate}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                    {v.patientName}{' '}
                    <span className="text-xs font-normal text-slate-500 font-mono tabular-nums">
                      ({v.patientAge}y)
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {v.village} · {v.district}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">{v.category}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                    {v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                    {v.hemoglobin !== null ? v.hemoglobin.toFixed(1) : '—'}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <RiskStatusText level={v.riskLevel} />
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <FollowUpStatusText status={v.followUpStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

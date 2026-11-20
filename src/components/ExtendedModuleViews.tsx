import {
  ArrowRight,
  Baby,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  HeartHandshake,
  Search,
  ShieldAlert,
  UserCheck,
  Volume2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { KARNATAKA_NFHS5_DATA } from '../data/karnatakaNfhs5';
import type { FollowUpStatus, VisitRecord, WorkerProfile } from '../types/health';
import { buildBeneficiaryCohorts, summarizeRegisterMetrics } from '../utils/clinicalTriage';
import { exportVisitsToExcel, exportVisitsToPdf } from '../utils/exportRegister';
import {
  summarizeDiseaseSurveillance,
  summarizeHouseholdsByVillage,
  summarizeMaternalChildSplit,
} from '../utils/populationMetrics';
import { FollowUpStatusText, RiskStatusText } from './RiskLabel';

/* 1. Data Management */
export function DataManagementView({
  visits,
  activeWorker,
  onOpenWorkerSwitch,
  onUpdateFollowUp,
}: {
  visits: VisitRecord[];
  activeWorker: WorkerProfile;
  onOpenWorkerSwitch: () => void;
  onUpdateFollowUp: (visitId: number, status: FollowUpStatus) => Promise<void>;
}) {
  const metrics = summarizeRegisterMetrics(visits);
  const [statusMessage, setStatusMessage] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const pendingNormalVisits = visits.filter(
    (v) => v.followUpStatus === 'pending' && v.riskLevel === 'normal'
  );

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(visits, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ashasakhi-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported ${visits.length} register records as JSON.`);
  }

  async function handleResolveRoutinePending() {
    if (pendingNormalVisits.length === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all(pendingNormalVisits.map((v) => onUpdateFollowUp(v.id, 'completed')));
      setStatusMessage(`Marked ${pendingNormalVisits.length} routine pending visits completed.`);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Persisted Register Rows</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-slate-900">
            {metrics.totalVisits}
          </p>
          <p className="mt-1 text-xs text-slate-500">Stored in SQLite (ashasakhi.db)</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Active PHC Context</p>
          <p className="mt-2 text-lg font-semibold text-slate-900 truncate">{activeWorker.phcName}</p>
          <p className="mt-1 text-xs text-slate-500">
            {activeWorker.taluk} · {activeWorker.district}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Routine Pending Queue</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-teal-800">
            {pendingNormalVisits.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Eligible for batch completion</p>
        </div>
      </section>

      {statusMessage && (
        <div className="px-4 py-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Register Export &amp; Backup</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Download structured ASHA home visit data for Taluk / PHC submission
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                exportVisitsToPdf(visits, `${activeWorker.phcName} · ${activeWorker.district}`);
                setStatusMessage(`Generated PDF register (${visits.length} records).`);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download PDF Register
            </button>
            <button
              type="button"
              onClick={() => {
                exportVisitsToExcel(visits);
                setStatusMessage(`Exported Excel workbook (${visits.length} rows).`);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Export Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <FileJson className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Export JSON Backup
            </button>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Worker &amp; Queue Maintenance</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage active ASHA / Officer credentials and batch-resolve routine follow-ups
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenWorkerSwitch}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <UserCheck className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
              Manage Worker Accounts
            </button>
            <button
              type="button"
              disabled={bulkBusy || pendingNormalVisits.length === 0}
              onClick={handleResolveRoutinePending}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Complete Routine Pending ({pendingNormalVisits.length})
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* 2. Health Reports */
export function HealthReportsView({
  visits,
  activeWorker,
  onOpenNfhs,
}: {
  visits: VisitRecord[];
  activeWorker: WorkerProfile;
  onOpenNfhs: () => void;
}) {
  const metrics = summarizeRegisterMetrics(visits);
  const villages = useMemo(() => summarizeHouseholdsByVillage(visits), [visits]);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Monthly PHC &amp; NHM Health Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeWorker.phcName} · {activeWorker.district} · Live rollup from {metrics.totalVisits} home visits
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportVisitsToPdf(visits, `${activeWorker.phcName} · ${activeWorker.district}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export PDF Report
          </button>
          <button
            type="button"
            onClick={() => exportVisitsToExcel(visits)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={onOpenNfhs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap"
          >
            NFHS-5 Benchmarks
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Maternal ANC/PNC Share</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {metrics.totalVisits > 0 ? Math.round((metrics.ancVisitsCount / metrics.totalVisits) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">High-Risk Detection Rate</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-semibold text-red-700">
            {metrics.totalVisits > 0 ? Math.round((metrics.highRiskCount / metrics.totalVisits) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Follow-up Closure Rate</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-semibold text-emerald-700">
            {metrics.totalVisits > 0
              ? Math.round((metrics.completedOrReferred / metrics.totalVisits) * 100)
              : 0}
            %
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Villages Covered</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {villages.length}
          </p>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">Village-Wise Indicator Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Village</th>
                <th className="py-2.5 px-4">District</th>
                <th className="py-2.5 px-4 text-right">Citizens</th>
                <th className="py-2.5 px-4 text-right">Visits</th>
                <th className="py-2.5 px-4 text-right">High Risk</th>
                <th className="py-2.5 px-4 text-right">IFA Issued</th>
                <th className="py-2.5 px-4">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {villages.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-medium text-slate-900">{row.village}</td>
                  <td className="py-2.5 px-4 text-slate-600">{row.district}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.uniqueCitizens}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.totalVisits}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700 font-medium">
                    {row.highRiskCount}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.ifaTabletsTotal}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500">{row.lastVisitDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* 3. Households */
export function HouseholdsView({
  visits,
  onOpenRegister,
}: {
  visits: VisitRecord[];
  onOpenRegister: () => void;
}) {
  const villages = useMemo(() => summarizeHouseholdsByVillage(visits), [visits]);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Household &amp; Village Catchment Coverage
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active ASHA catchment areas grouped by village, PHC, and household visits
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenRegister}
          className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
        >
          Record Household Visit
        </button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {villages.map((v) => (
          <div key={v.key} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{v.village}</h3>
                <p className="text-xs text-slate-500">
                  {v.phcName} · {v.district}
                </p>
              </div>
              {v.highRiskCount > 0 ? (
                <span className="text-xs font-semibold text-red-700 font-mono tabular-nums whitespace-nowrap">
                  {v.highRiskCount} High Risk
                </span>
              ) : (
                <span className="text-xs font-medium text-emerald-700 whitespace-nowrap">Nominal</span>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-slate-500">Beneficiaries</p>
                <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-slate-900">
                  {v.uniqueCitizens}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Total Visits</p>
                <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-slate-900">
                  {v.totalVisits}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Pending Due</p>
                <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-amber-700">
                  {v.pendingCount}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-mono tabular-nums">
              IFA Issued: {v.ifaTabletsTotal} tabs · Last visit {v.lastVisitDate}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 4. Citizens */
export function CitizensView({
  visits,
  onSelectCitizenForRecord,
}: {
  visits: VisitRecord[];
  onSelectCitizenForRecord: (cohortKey: string) => void;
}) {
  const [query, setQuery] = useState('');
  const cohorts = useMemo(() => buildBeneficiaryCohorts(visits), [visits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cohorts;
    return cohorts.filter((c) =>
      `${c.patientName} ${c.village} ${c.district} ${c.primaryCategory}`.toLowerCase().includes(q)
    );
  }, [cohorts, query]);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Registered Citizens &amp; Beneficiaries
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              {filtered.length} unique mothers &amp; children in ASHA catchment
            </p>
          </div>
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search citizens by name or village"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search citizen, village..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Citizen Name</th>
                <th className="py-2.5 px-4 text-right">Age</th>
                <th className="py-2.5 px-4">Village / District</th>
                <th className="py-2.5 px-4">Program</th>
                <th className="py-2.5 px-4 text-right">Visits</th>
                <th className="py-2.5 px-4">Highest Risk</th>
                <th className="py-2.5 px-4 text-right">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filtered.map((c) => (
                <tr key={c.key} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-medium text-slate-900">{c.patientName}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{c.patientAge}y</td>
                  <td className="py-3 px-4 text-slate-600">
                    {c.village}, {c.district}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{c.primaryCategory}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{c.visitCount}</td>
                  <td className="py-3 px-4">
                    <RiskStatusText level={c.highestRisk} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectCitizenForRecord(c.key)}
                      className="text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap"
                    >
                      Open Timeline
                    </button>
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

/* 5. Community Surveys */
export function CommunitySurveysView({
  onSelectDistrictForNfhs,
}: {
  onSelectDistrictForNfhs: (districtId: string) => void;
}) {
  const divisions = useMemo(() => {
    const groups = new Map<string, typeof KARNATAKA_NFHS5_DATA>();
    for (const row of KARNATAKA_NFHS5_DATA) {
      if (row.isStateAverage) continue;
      const list = groups.get(row.division) || [];
      list.push(row);
      groups.set(row.division, list);
    }
    return Array.from(groups.entries());
  }, []);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Community Surveys — Karnataka Regional Coverage
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            NFHS-5 household and community survey indicators grouped by Karnataka administrative division
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelectDistrictForNfhs('yadgir')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
        >
          Open NFHS-5 Explorer
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {divisions.map(([division, rows]) => (
          <section key={division} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{division} Division</h3>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {rows.length} districts
              </span>
            </div>
            <div className="divide-y divide-slate-200">
              {rows.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelectDistrictForNfhs(d.id)}
                  className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <p className="font-medium text-slate-900">{d.district}</p>
                    <p className="text-slate-500 font-mono tabular-nums mt-0.5">
                      4+ ANC: {d.anc4PlusPct}% · Immunization: {d.fullImmunizationPct}%
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <p className="text-red-700 font-medium">{d.pregnantWomenAnaemicPct}% Anaemia</p>
                    <p className="text-slate-500">{d.stuntingPct}% Stunting</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/* 6. Disease Surveillance */
export function DiseaseSurveillanceView({ visits }: { visits: VisitRecord[] }) {
  const clusters = useMemo(() => summarizeDiseaseSurveillance(visits), [visits]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {clusters.map((c) => (
          <div key={c.syndrome} className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">{c.syndrome}</p>
            <p
              className={`mt-2 font-mono tabular-nums text-3xl font-semibold ${
                c.severity === 'high'
                  ? 'text-red-700'
                  : c.severity === 'moderate'
                  ? 'text-amber-700'
                  : 'text-teal-800'
              }`}
            >
              {c.caseCount}
            </p>
            <p className="mt-2 text-xs text-slate-500 truncate">
              {c.villages.length > 0 ? `Villages: ${c.villages.join(', ')}` : 'No active cases'}
            </p>
          </div>
        ))}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Syndromic Surveillance Case Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active cases clustered from ASHA home visit symptoms and clinical vitals
          </p>
        </div>
        <div className="divide-y divide-slate-200">
          {clusters.map((cluster) => (
            <div key={cluster.syndrome} className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{cluster.syndrome}</h3>
                <span className="font-mono tabular-nums text-xs font-medium text-slate-600">
                  {cluster.caseCount} flagged visit{cluster.caseCount === 1 ? '' : 's'}
                </span>
              </div>
              {cluster.matchedVisits.length === 0 ? (
                <p className="text-xs text-slate-500">No active cases recorded for this syndrome.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cluster.matchedVisits.map((v) => (
                    <div key={v.id} className="pt-2 border-t border-slate-100 text-xs flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {v.patientName} ({v.patientAge}y) · {v.village}
                        </p>
                        <p className="text-slate-600 mt-0.5">{v.symptoms}</p>
                      </div>
                      <RiskStatusText level={v.riskLevel} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* 7. Maternal & Child */
export function MaternalChildView({
  visits,
  onOpenRegister,
}: {
  visits: VisitRecord[];
  onOpenRegister: () => void;
}) {
  const [segment, setSegment] = useState<'maternal' | 'child'>('maternal');
  const split = useMemo(() => summarizeMaternalChildSplit(visits), [visits]);
  const rows = segment === 'maternal' ? split.maternalVisits : split.childVisits;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Maternal Visits (ANC / PNC)</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-slate-900">
            {split.maternalVisits.length}
          </p>
          <p className="mt-1 text-xs text-red-700 font-mono tabular-nums">
            {split.maternalHighRisk} High Risk pregnancies
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Mean Maternal Hemoglobin</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-teal-800">
            {split.averageMaternalHb !== null ? `${split.averageMaternalHb} g/dL` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Target &ge; 11.0 g/dL</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Child &amp; Nutrition Visits</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-slate-900">
            {split.childVisits.length}
          </p>
          <p className="mt-1 text-xs text-amber-700 font-mono tabular-nums">
            {split.childHighOrMod} needing nutrition/clinical review
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Maternal IFA Tablets Issued</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-slate-900">
            {split.maternalIfaTotal}
          </p>
          <p className="mt-1 text-xs text-slate-500">Iron &amp; Folic Acid supply</p>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSegment('maternal')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                segment === 'maternal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <HeartHandshake className="h-3.5 w-3.5" aria-hidden="true" />
              Maternal (ANC / PNC)
            </button>
            <button
              type="button"
              onClick={() => setSegment('child')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                segment === 'child' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Baby className="h-3.5 w-3.5" aria-hidden="true" />
              Child Care &amp; Nutrition
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenRegister}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
          >
            Log {segment === 'maternal' ? 'Maternal' : 'Child'} Visit
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Beneficiary</th>
                <th className="py-2.5 px-4">Village</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Immunization / Gestation</th>
                <th className="py-2.5 px-4 text-right">Weight / Hb</th>
                <th className="py-2.5 px-4">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-600">{v.visitDate}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {v.patientName} ({v.patientAge}y)
                  </td>
                  <td className="py-3 px-4 text-slate-600">{v.village}</td>
                  <td className="py-3 px-4 text-slate-700">{v.category}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {v.gestationalWeeks ? `${v.gestationalWeeks} wks · ` : ''}
                    {v.immunizationStatus || 'Scheduled'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                    {v.weightKg !== null ? `${v.weightKg}kg` : '—'} ·{' '}
                    {v.hemoglobin !== null ? `${v.hemoglobin.toFixed(1)} g/dL` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <RiskStatusText level={v.riskLevel} />
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

/* 8. DangerSign Alerts */
export function DangerSignAlertsView({
  visits,
  onUpdateFollowUp,
}: {
  visits: VisitRecord[];
  onUpdateFollowUp: (visitId: number, status: FollowUpStatus) => Promise<void>;
}) {
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const alerts = useMemo(
    () => visits.filter((v) => v.riskLevel === 'high'),
    [visits]
  );

  async function handleSpeakAlert(v: VisitRecord) {
    setSpeakingId(v.id);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `High-risk alert for ${v.patientName} in ${v.village}. Triggers: ${v.riskReasons.join(', ')}. Action required: ${v.recommendedAction}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        await audio.play();
      }
    } finally {
      setSpeakingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            DangerSign &amp; High-Risk Clinical Alerts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immediate maternal &amp; infant escalation queue based on NHM vital and symptom thresholds
          </p>
        </div>
        <span className="font-mono tabular-nums text-xs font-semibold text-red-700">
          {alerts.filter((a) => a.followUpStatus === 'pending').length} Pending Escalation · {alerts.length} Total High Risk
        </span>
      </section>

      {alerts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-900">No high-risk danger-sign alerts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((v) => (
            <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base font-semibold text-slate-900">{v.patientName}</span>
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      {v.patientAge}y · {v.village}, {v.district} · {v.category}
                    </span>
                    <RiskStatusText level={v.riskLevel} />
                    <FollowUpStatusText status={v.followUpStatus} />
                  </div>
                  <p className="text-xs font-medium text-red-700">
                    Triggers: {v.riskReasons.join(' · ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={speakingId === v.id}
                    onClick={() => handleSpeakAlert(v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 whitespace-nowrap"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                    Speak Alert
                  </button>
                  {v.followUpStatus === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onUpdateFollowUp(v.id, 'referred')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 whitespace-nowrap"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        Refer to PHC
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateFollowUp(v.id, 'completed')}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap"
                      >
                        Mark Resolved
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
                <p>{v.recommendedAction}</p>
                <span className="font-mono tabular-nums text-slate-500">
                  Visit {v.visitDate} · Due {v.nextVisitDate}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

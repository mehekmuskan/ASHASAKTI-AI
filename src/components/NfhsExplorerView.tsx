import { Loader2, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  compareDistrictToState,
  KARNATAKA_NFHS5_DATA,
  NFHS_INDICATORS,
} from '../data/karnatakaNfhs5';

interface NfhsExplorerViewProps {
  selectedDistrictId: string;
  onSelectDistrictId: (id: string) => void;
}

type IndicatorCategoryFilter = 'All' | 'Maternal Care' | 'Anaemia Burden' | 'Child Nutrition';

const PRESET_QUESTIONS = [
  'What are the top 3 ASHA & VHSND interventions to reduce anaemia in this district?',
  'How can 4+ ANC visits and 100-day IFA compliance be improved at sub-centre level?',
  'What nutrition and NRC referral priorities emerge from under-5 stunting and wasting rates?',
];

export function NfhsExplorerView({
  selectedDistrictId,
  onSelectDistrictId,
}: NfhsExplorerViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<IndicatorCategoryFilter>('All');
  const [question, setQuestion] = useState(PRESET_QUESTIONS[0]);
  const [briefText, setBriefText] = useState('');
  const [briefDistrict, setBriefDistrict] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');

  const stateBaseline = useMemo(
    () => KARNATAKA_NFHS5_DATA.find((d) => d.isStateAverage)!,
    []
  );

  const selectedDistrict = useMemo(
    () =>
      KARNATAKA_NFHS5_DATA.find((d) => d.id === selectedDistrictId && !d.isStateAverage) ||
      KARNATAKA_NFHS5_DATA.find((d) => d.id === 'yadgir')!,
    [selectedDistrictId]
  );

  const comparisons = useMemo(
    () => compareDistrictToState(selectedDistrict, stateBaseline),
    [selectedDistrict, stateBaseline]
  );

  const visibleComparisons = useMemo(() => {
    if (categoryFilter === 'All') return comparisons;
    const allowedKeys = new Set(
      NFHS_INDICATORS.filter((m) => m.category === categoryFilter).map((m) => m.key)
    );
    return comparisons.filter((c) => allowedKeys.has(c.key));
  }, [comparisons, categoryFilter]);

  async function handleGenerateBrief(customQuestion?: string) {
    setBriefError('');
    setBriefLoading(true);
    try {
      const res = await fetch('/api/nfhs/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          districtId: selectedDistrict.id,
          question: customQuestion ?? question,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBriefError(data.error || 'Could not generate district brief.');
        return;
      }
      setBriefText(data.brief || '');
      setBriefDistrict(data.district || selectedDistrict.district);
    } catch {
      setBriefError('Network error while generating district brief.');
    } finally {
      setBriefLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* District Selector & Category Filter Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Karnataka NFHS-5 (2019–21) Public Health Intelligence
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official MoHFW District Fact Sheet indicators benchmarked against Karnataka State Average &amp; NHM Targets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="nfhs-district-select" className="text-xs font-medium text-slate-700 whitespace-nowrap">
              District:
            </label>
            <select
              id="nfhs-district-select"
              value={selectedDistrict.id}
              onChange={(e) => onSelectDistrictId(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              {KARNATAKA_NFHS5_DATA.filter((d) => !d.isStateAverage).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.district} ({d.division})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-full">
            {(['All', 'Maternal Care', 'Anaemia Burden', 'Child Nutrition'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Comparison + AI Policy Brief Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left: District vs Karnataka State Average Bars */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {selectedDistrict.district} vs Karnataka State Average
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Solid bar shows {selectedDistrict.district}; vertical tick marks Karnataka State Average
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
              {selectedDistrict.division} Division
            </span>
          </div>

          <div className="mt-4 space-y-4 flex-1">
            {visibleComparisons.map((item) => {
              const meta = NFHS_INDICATORS.find((m) => m.key === item.key)!;
              const statusColor = item.meetsTarget
                ? 'text-emerald-700'
                : item.isOutperformingState
                ? 'text-teal-700'
                : 'text-red-700';
              const barColor = item.meetsTarget
                ? 'bg-emerald-600'
                : item.isOutperformingState
                ? 'bg-teal-700'
                : 'bg-amber-600';

              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800">{meta.label}</span>
                    <div className="flex items-center gap-3 font-mono tabular-nums">
                      <span className="font-semibold text-slate-900">{item.districtValue}%</span>
                      <span className="text-slate-400">KA: {item.stateValue}%</span>
                      <span className={statusColor}>
                        {item.meetsTarget
                          ? `Target Met (${meta.higherIsBetter ? '≥' : '≤'}${item.targetValue}%)`
                          : `Gap: ${item.gapToTarget}% to NHM ${item.targetValue}%`}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-visible">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(100, item.districtValue)}%` }}
                    />
                    <div
                      className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-slate-900"
                      style={{ left: `${Math.min(99, item.stateValue)}%` }}
                      title={`Karnataka State Average: ${item.stateValue}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Grounded Gemini Policy Brief */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                AI District Intervention Brief
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Synthesize NHM Karnataka field actions grounded in {selectedDistrict.district}&apos;s NFHS-5 data
              </p>
            </div>

            <div className="space-y-1.5">
              {PRESET_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuestion(q);
                    handleGenerateBrief(q);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="nfhs-brief-question" className="block text-xs font-medium text-slate-700 mb-1">
                Custom Officer / Supervisor Query
              </label>
              <textarea
                id="nfhs-brief-question"
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <button
              type="button"
              disabled={briefLoading}
              onClick={() => handleGenerateBrief()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-60"
            >
              {briefLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Generating District Brief...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Generate {selectedDistrict.district} Brief
                </>
              )}
            </button>
          </div>

          <div className="flex-1 min-h-[150px] pt-4 border-t border-slate-200">
            {briefError ? (
              <p className="text-xs text-red-700">{briefError}</p>
            ) : briefText ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-teal-800">
                  Policy Brief — {briefDistrict}
                </p>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {briefText}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Select a prompt above or click Generate to receive a district-specific ASHA and PHC intervention plan referencing {selectedDistrict.district}&apos;s NFHS-5 figures.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Full Karnataka District Benchmark Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">
            Karnataka District NFHS-5 Benchmark Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any district row to inspect its full profile and target gaps above
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">District</th>
                <th className="py-2.5 px-4">Division</th>
                <th className="py-2.5 px-4 text-right">4+ ANC %</th>
                <th className="py-2.5 px-4 text-right">Inst. Birth %</th>
                <th className="py-2.5 px-4 text-right">IFA 100d %</th>
                <th className="py-2.5 px-4 text-right">Preg. Anaemia %</th>
                <th className="py-2.5 px-4 text-right">Child Anaemia %</th>
                <th className="py-2.5 px-4 text-right">Full Immun. %</th>
                <th className="py-2.5 px-4 text-right">Stunting %</th>
                <th className="py-2.5 px-4 text-right">Wasting %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {KARNATAKA_NFHS5_DATA.map((row) => {
                const isSelected = row.id === selectedDistrict.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => {
                      if (!row.isStateAverage) onSelectDistrictId(row.id);
                    }}
                    className={`transition-colors ${
                      row.isStateAverage
                        ? 'bg-slate-100/80 font-semibold text-slate-900'
                        : isSelected
                        ? 'bg-teal-50/70 text-slate-900 cursor-pointer'
                        : 'hover:bg-slate-50 text-slate-700 cursor-pointer'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                      {row.district}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{row.division}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.anc4PlusPct.toFixed(1)}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.institutionalBirthPct.toFixed(1)}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.ifa100DaysPct.toFixed(1)}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700 font-medium">
                      {row.pregnantWomenAnaemicPct.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.childrenAnaemicPct.toFixed(1)}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.fullImmunizationPct.toFixed(1)}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.stuntingPct.toFixed(1)}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.wastingPct.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

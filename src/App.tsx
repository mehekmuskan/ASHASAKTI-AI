import { ClipboardPlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CitizensView,
  CommunitySurveysView,
  DangerSignAlertsView,
  DataManagementView,
  DiseaseSurveillanceView,
  HealthReportsView,
  HouseholdsView,
  MaternalChildView,
} from './components/ExtendedModuleViews';
import { FieldRegisterView } from './components/FieldRegisterView';
import { FollowUpsView } from './components/FollowUpsView';
import { NfhsExplorerView } from './components/NfhsExplorerView';
import { OverviewView } from './components/OverviewView';
import { MobileNavTrigger, Sidebar, type NavTab } from './components/Sidebar';
import { WorkerSwitchModal } from './components/WorkerSwitchModal';
import type { FollowUpStatus, VisitInput, VisitRecord, WorkerProfile } from './types/health';

const FALLBACK_WORKER: WorkerProfile = {
  id: 1,
  name: 'Kavitha Gowda',
  role: 'ASHA Worker',
  phone: '9845011223',
  phcName: 'Doddaballapura PHC',
  taluk: 'Doddaballapura',
  district: 'Bengaluru Rural',
  avatarUrl: '/src/assets/images/avatar_asha_worker_1795142762159.jpg',
};

const TAB_LABELS: Record<NavTab, string> = {
  overview: 'Public Health Overview',
  nfhs: 'Karnataka NFHS-5 Survey',
  reports: 'Health Reports',
  surveys: 'Community Surveys',
  'data-management': 'Data Management',
  households: 'Households',
  citizens: 'Citizens',
  longitudinal: 'Longitudinal Records',
  surveillance: 'Disease Surveillance',
  'voice-intake': 'Voice Intake',
  register: 'Field Register',
  'maternal-child': 'Maternal & Child',
  'dangersign-alerts': 'DangerSign Alerts',
  followups: 'Follow-ups',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerProfile[]>([FALLBACK_WORKER]);
  const [activeWorker, setActiveWorker] = useState<WorkerProfile>(FALLBACK_WORKER);
  const [selectedNfhsDistrictId, setSelectedNfhsDistrictId] = useState<string>('yadgir');
  const [selectedCohortKey, setSelectedCohortKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [visitsRes, workersRes] = await Promise.all([
        fetch('/api/visits'),
        fetch('/api/auth/workers'),
      ]);

      if (!visitsRes.ok) {
        throw new Error('Failed to load visit register from database.');
      }

      const visitsJson = await visitsRes.json();
      setVisits(visitsJson.visits || []);

      if (workersRes.ok) {
        const workersJson = await workersRes.json();
        if (Array.isArray(workersJson.workers) && workersJson.workers.length > 0) {
          setWorkers(workersJson.workers);
          setActiveWorker((prev) => {
            const match = workersJson.workers.find((w: WorkerProfile) => w.id === prev.id);
            return match || workersJson.workers[0];
          });
        }
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load workspace data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const pendingHighRiskCount = useMemo(
    () => visits.filter((v) => v.riskLevel === 'high' && v.followUpStatus === 'pending').length,
    [visits]
  );

  async function handleCreateVisit(input: VisitInput): Promise<VisitRecord> {
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        workerId: activeWorker.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save visit record.');
    }
    setVisits((prev) => [data.visit, ...prev]);
    return data.visit;
  }

  async function handleUpdateFollowUp(
    visitId: number,
    status: FollowUpStatus,
    counselingGiven?: string
  ): Promise<void> {
    const res = await fetch(`/api/visits/${visitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followUpStatus: status, counselingGiven }),
    });
    const data = await res.json();
    if (res.ok && data.visit) {
      setVisits((prev) => prev.map((v) => (v.id === visitId ? data.visit : v)));
    }
  }

  async function handleDeleteVisit(visitId: number): Promise<void> {
    const res = await fetch(`/api/visits/${visitId}`, { method: 'DELETE' });
    if (res.ok) {
      setVisits((prev) => prev.filter((v) => v.id !== visitId));
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeWorker={activeWorker}
        pendingHighRiskCount={pendingHighRiskCount}
        onOpenWorkerSwitch={() => setWorkerModalOpen(true)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-5 lg:px-8 py-3.5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <MobileNavTrigger onClick={() => setMobileNavOpen(true)} />
            <div className="min-w-0 flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-500 whitespace-nowrap">AshaSakhi-AI</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <h1 className="font-display font-semibold text-slate-900 truncate">
                {TAB_LABELS[activeTab]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500 whitespace-nowrap">
              {activeWorker.phcName} · {activeWorker.district}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <ClipboardPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Log Visit
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {loadError ? (
            <div className="bg-white border border-red-200 rounded-xl p-6 text-center space-y-3">
              <p className="text-sm font-semibold text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={loadInitialData}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                Retry Loading Data
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-6" aria-label="Loading workspace">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
              <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  visits={visits}
                  onNavigateRegister={() => setActiveTab('register')}
                  onNavigateNfhs={(districtId) => {
                    if (districtId) setSelectedNfhsDistrictId(districtId);
                    setActiveTab('nfhs');
                  }}
                  onNavigateFollowUps={() => setActiveTab('followups')}
                  onUpdateFollowUp={handleUpdateFollowUp}
                />
              )}

              {activeTab === 'nfhs' && (
                <NfhsExplorerView
                  selectedDistrictId={selectedNfhsDistrictId}
                  onSelectDistrictId={setSelectedNfhsDistrictId}
                />
              )}

              {activeTab === 'reports' && (
                <HealthReportsView
                  visits={visits}
                  activeWorker={activeWorker}
                  onOpenNfhs={() => setActiveTab('nfhs')}
                />
              )}

              {activeTab === 'surveys' && (
                <CommunitySurveysView
                  onSelectDistrictForNfhs={(districtId) => {
                    setSelectedNfhsDistrictId(districtId);
                    setActiveTab('nfhs');
                  }}
                />
              )}

              {activeTab === 'data-management' && (
                <DataManagementView
                  visits={visits}
                  activeWorker={activeWorker}
                  onOpenWorkerSwitch={() => setWorkerModalOpen(true)}
                  onUpdateFollowUp={handleUpdateFollowUp}
                />
              )}

              {activeTab === 'households' && (
                <HouseholdsView
                  visits={visits}
                  onOpenRegister={() => setActiveTab('register')}
                />
              )}

              {activeTab === 'citizens' && (
                <CitizensView
                  visits={visits}
                  onSelectCitizenForRecord={(key) => {
                    setSelectedCohortKey(key);
                    setActiveTab('longitudinal');
                  }}
                />
              )}

              {activeTab === 'longitudinal' && (
                <FollowUpsView
                  key="longitudinal"
                  visits={visits}
                  initialFilter="all"
                  initialCohortKey={selectedCohortKey}
                  heading="Longitudinal Maternal & Child Records"
                  onUpdateFollowUp={handleUpdateFollowUp}
                />
              )}

              {activeTab === 'surveillance' && (
                <DiseaseSurveillanceView visits={visits} />
              )}

              {activeTab === 'voice-intake' && (
                <FieldRegisterView
                  visits={visits}
                  activeWorker={activeWorker}
                  mode="intake"
                  onOpenFullRegister={() => setActiveTab('register')}
                  onCreateVisit={handleCreateVisit}
                  onUpdateFollowUp={handleUpdateFollowUp}
                  onDeleteVisit={handleDeleteVisit}
                />
              )}

              {activeTab === 'register' && (
                <FieldRegisterView
                  visits={visits}
                  activeWorker={activeWorker}
                  mode="full"
                  onCreateVisit={handleCreateVisit}
                  onUpdateFollowUp={handleUpdateFollowUp}
                  onDeleteVisit={handleDeleteVisit}
                />
              )}

              {activeTab === 'maternal-child' && (
                <MaternalChildView
                  visits={visits}
                  onOpenRegister={() => setActiveTab('register')}
                />
              )}

              {activeTab === 'dangersign-alerts' && (
                <DangerSignAlertsView
                  visits={visits}
                  onUpdateFollowUp={handleUpdateFollowUp}
                />
              )}

              {activeTab === 'followups' && (
                <FollowUpsView
                  key="followups"
                  visits={visits}
                  initialFilter="pending"
                  onUpdateFollowUp={handleUpdateFollowUp}
                />
              )}
            </>
          )}
        </main>
      </div>

      <WorkerSwitchModal
        open={workerModalOpen}
        workers={workers}
        activeWorker={activeWorker}
        onSelectWorker={(w) => setActiveWorker(w)}
        onWorkerCreated={(w) => {
          setWorkers((prev) => [...prev, w]);
          setActiveWorker(w);
        }}
        onClose={() => setWorkerModalOpen(false)}
      />
    </div>
  );
}

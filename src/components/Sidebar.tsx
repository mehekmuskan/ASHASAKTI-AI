import {
  Activity,
  AlertTriangle,
  Baby,
  BarChart3,
  ClipboardList,
  Database,
  FileBarChart,
  FileText,
  FolderHeart,
  HeartPulse,
  Home,
  Menu,
  Mic,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { WorkerProfile } from '../types/health';

export type NavTab =
  | 'overview'
  | 'data-management'
  | 'reports'
  | 'nfhs'
  | 'households'
  | 'citizens'
  | 'longitudinal'
  | 'surveys'
  | 'surveillance'
  | 'register'
  | 'voice-intake'
  | 'maternal-child'
  | 'dangersign-alerts'
  | 'followups';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeWorker: WorkerProfile;
  pendingHighRiskCount: number;
  onOpenWorkerSwitch: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_GROUPS: Array<{
  groupLabel: string;
  items: Array<{ id: NavTab; label: string; icon: typeof Activity }>;
}> = [
  {
    groupLabel: 'Public Health & Reports',
    items: [
      { id: 'overview', label: 'Public Health Overview', icon: Activity },
      { id: 'nfhs', label: 'NFHS-5 Survey', icon: BarChart3 },
      { id: 'reports', label: 'Health Reports', icon: FileBarChart },
      { id: 'surveys', label: 'Community Surveys', icon: FileText },
      { id: 'data-management', label: 'Data Management', icon: Database },
    ],
  },
  {
    groupLabel: 'Population & Records',
    items: [
      { id: 'households', label: 'Households', icon: Home },
      { id: 'citizens', label: 'Citizens', icon: Users },
      { id: 'longitudinal', label: 'Longitudinal Records', icon: FolderHeart },
      { id: 'surveillance', label: 'Disease Surveillance', icon: ShieldAlert },
    ],
  },
  {
    groupLabel: 'ASHA Field Operations',
    items: [
      { id: 'voice-intake', label: 'Voice Intake', icon: Mic },
      { id: 'register', label: 'Field Register', icon: ClipboardList },
      { id: 'maternal-child', label: 'Maternal & Child', icon: Baby },
      { id: 'dangersign-alerts', label: 'DangerSign Alerts', icon: AlertTriangle },
      { id: 'followups', label: 'Follow-ups', icon: HeartPulse },
    ],
  },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  activeWorker,
  pendingHighRiskCount,
  onOpenWorkerSwitch,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = activeWorker.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200">
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectTab('overview');
              onCloseMobile();
            }}
            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-md"
          >
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              AshaSakhi-AI
            </span>
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.groupLabel} className="space-y-0.5">
              <p className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                {group.groupLabel}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const showAlertCount =
                  (item.id === 'followups' || item.id === 'dangersign-alerts') &&
                  pendingHighRiskCount > 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-teal-50 text-teal-800 border border-teal-200/80'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {showAlertCount && (
                      <span className="font-mono tabular-nums text-xs font-semibold text-red-700 ml-2 shrink-0">
                        {pendingHighRiskCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-3">
          {!imgError && activeWorker.avatarUrl ? (
            <img
              src={activeWorker.avatarUrl}
              alt={activeWorker.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{activeWorker.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {activeWorker.role} · {activeWorker.district}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 truncate">{activeWorker.phcName}</p>
        <button
          type="button"
          onClick={onOpenWorkerSwitch}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <UserCheck className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden="true" />
          Switch Worker Profile
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">{navContent}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
}

export function MobileNavTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation menu"
      className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

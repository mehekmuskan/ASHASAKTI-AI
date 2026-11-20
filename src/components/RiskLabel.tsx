import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import type { FollowUpStatus, RiskLevel } from '../types/health';

export function RiskStatusText({ level }: { level: RiskLevel }) {
  if (level === 'high') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden="true" />
        High Risk
      </span>
    );
  }
  if (level === 'moderate') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
        Moderate
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
      Normal
    </span>
  );
}

export function FollowUpStatusText({ status }: { status: FollowUpStatus }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
        Completed
      </span>
    );
  }
  if (status === 'referred') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 whitespace-nowrap">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />
        PHC Referred
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
      <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
      Pending
    </span>
  );
}

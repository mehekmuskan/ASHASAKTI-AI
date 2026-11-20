import { UserCheck, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import type { WorkerProfile, WorkerRole } from '../types/health';

interface WorkerSwitchModalProps {
  open: boolean;
  workers: WorkerProfile[];
  activeWorker: WorkerProfile;
  onSelectWorker: (worker: WorkerProfile) => void;
  onWorkerCreated: (worker: WorkerProfile) => void;
  onClose: () => void;
}

export function WorkerSwitchModal({
  open,
  workers,
  activeWorker,
  onSelectWorker,
  onWorkerCreated,
  onClose,
}: WorkerSwitchModalProps) {
  const [mode, setMode] = useState<'switch' | 'login' | 'register'>('switch');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<WorkerRole>('ASHA Worker');
  const [phcName, setPhcName] = useState('Doddaballapura PHC');
  const [taluk, setTaluk] = useState('Doddaballapura');
  const [district, setDistrict] = useState('Bengaluru Rural');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      onSelectWorker(data.worker);
      onClose();
    } catch {
      setError('Unable to reach server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, phone, phcName, taluk, district, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      onWorkerCreated(data.worker);
      onClose();
    } catch {
      setError('Unable to reach server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="worker-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 id="worker-modal-title" className="text-base font-semibold text-slate-900">
            Worker Account &amp; PHC Context
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close worker profile dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('switch');
                setError('');
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'switch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quick Switch
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register Worker
            </button>
          </div>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {mode === 'switch' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-500 mb-3">
                Select a registered Karnataka field worker or Taluk Health Officer profile:
              </p>
              {workers.map((w) => {
                const isCurrent = w.id === activeWorker.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      onSelectWorker(w);
                      onClose();
                    }}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'border-teal-600 bg-teal-50/60'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{w.name}</p>
                      <p className="text-xs text-slate-600">
                        {w.role} · {w.phcName} · {w.district}
                      </p>
                      <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                        Phone: {w.phone}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-teal-700 whitespace-nowrap">
                      {isCurrent ? 'Active' : 'Switch'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="login-phone" className="block text-xs font-medium text-slate-700 mb-1">
                  Registered Phone Number
                </label>
                <input
                  id="login-phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9845011223"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <p className="text-xs text-slate-500">
                Seeded demo credentials: Phone <span className="font-mono">9845011223</span> / Password{' '}
                <span className="font-mono">asha2026</span>
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-60"
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                {submitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Suma Narayan"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label htmlFor="reg-role" className="block text-xs font-medium text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    id="reg-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as WorkerRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="ASHA Worker">ASHA Worker</option>
                    <option value="Taluk Health Officer">Taluk Health Officer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-phone" className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="reg-phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label htmlFor="reg-pass" className="block text-xs font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    id="reg-pass"
                    type="password"
                    required
                    minLength={4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="reg-phc" className="block text-xs font-medium text-slate-700 mb-1">
                    PHC Name
                  </label>
                  <input
                    id="reg-phc"
                    type="text"
                    required
                    value={phcName}
                    onChange={(e) => setPhcName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label htmlFor="reg-taluk" className="block text-xs font-medium text-slate-700 mb-1">
                    Taluk
                  </label>
                  <input
                    id="reg-taluk"
                    type="text"
                    required
                    value={taluk}
                    onChange={(e) => setTaluk(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label htmlFor="reg-district" className="block text-xs font-medium text-slate-700 mb-1">
                    District
                  </label>
                  <input
                    id="reg-district"
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {submitting ? 'Creating Account...' : 'Create Worker Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

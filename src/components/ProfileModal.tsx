import React from 'react';
import { X, User, Car, Settings, HelpCircle, ShieldCheck } from 'lucide-react';
import { TestState } from '../types.ts';

interface ProfileModalProps {
  isOpen: boolean;
  testState: TestState;
  onClose: () => void;
  onTestStateChange: (state: TestState) => void;
  onOpenSavedModal: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  testState,
  onClose,
  onTestStateChange,
  onOpenSavedModal,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 id="profile-modal-title" className="text-base font-bold text-slate-900">
              Driver Profile & Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close profile modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-4">
          {/* Driver Card */}
          <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-xs">
              SG
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">
                Singapore Motorist
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Car className="w-3.5 h-3.5 text-indigo-600" />
                <span>Vehicle: Car (IU Type C)</span>
              </div>
            </div>
          </div>

          {/* Quick Settings */}
          <div className="pt-3 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Preferences
            </h3>
            <button
              type="button"
              onClick={() => {
                onOpenSavedModal();
                onClose();
              }}
              className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-left flex items-center justify-between text-xs font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <span>Manage Bookmarks & Saved Locations</span>
              <span className="text-indigo-600 font-semibold">View</span>
            </button>
            <div className="px-3 py-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs text-slate-700">
              <span>Distance Units</span>
              <span className="font-semibold text-slate-900">Kilometers / Meters</span>
            </div>
            <div className="px-3 py-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs text-slate-700">
              <span>Data Source</span>
              <span className="font-semibold text-indigo-700">LTA DataMall v2</span>
            </div>
          </div>

          {/* Simulation Section */}
          <div className="pt-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Settings className="w-3.5 h-3.5" />
              <span>Simulation & Diagnostics</span>
            </h3>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <label
                htmlFor="profile-test-state-select"
                className="block text-[11px] font-medium text-slate-500 mb-1"
              >
                Demo: simulate failure states
              </label>
              <select
                id="profile-test-state-select"
                value={testState}
                onChange={(e) => onTestStateChange(e.target.value as TestState)}
                className="w-full text-xs bg-white text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="success">Success (Live Data)</option>
                <option value="loading">Loading state</option>
                <option value="empty">Empty state (No carparks)</option>
                <option value="refused">Refused state (403)</option>
                <option value="unreachable">Unreachable state (500/offline)</option>
              </select>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="pt-3 flex items-start gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              ParkSG values your privacy. Precise GPS coordinates are processed on your device and are never stored on servers without explicit consent.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

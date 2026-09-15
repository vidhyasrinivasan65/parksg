import React from 'react';
import { TestState } from '../types.ts';

interface HeaderProps {
  testState: TestState;
  onStateChange: (state: TestState) => void;
}

export const Header: React.FC<HeaderProps> = ({ testState, onStateChange }) => {
  return (
    <header className="pt-6 pb-4 px-5 bg-white border-b border-slate-100 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div
            id="app-logo-badge"
            className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm shadow-indigo-200"
          >
            P
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            ParkSG
          </h1>
        </div>

        <span
          id="sg-live-badge"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/80"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          SG Live
        </span>
      </div>

      <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 leading-snug">
        Live lots in Singapore&apos;s busiest parking zones
      </p>

      {/* Testing State Switcher */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <label
          htmlFor="state-selector"
          className="text-[11px] font-bold uppercase tracking-wider text-slate-400"
        >
          TEST STATE:
        </label>
        <select
          id="state-selector"
          value={testState}
          onChange={(e) => onStateChange(e.target.value as TestState)}
          className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[36px] cursor-pointer"
        >
          <option value="success">Normal (Success)</option>
          <option value="loading">loading</option>
          <option value="empty">empty</option>
          <option value="refused">refused</option>
          <option value="unreachable">unreachable</option>
        </select>
      </div>
    </header>
  );
};

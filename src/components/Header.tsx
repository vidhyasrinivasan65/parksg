import React from 'react';

export const Header: React.FC = () => {
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
    </header>
  );
};

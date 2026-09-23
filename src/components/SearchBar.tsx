import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  totalCount?: number;
  filteredCount?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  placeholder = 'Search carparks by name...',
  totalCount,
  filteredCount,
}) => {
  const isFiltering = searchQuery.trim().length > 0;

  return (
    <div className="mb-3">
      <div role="search" className="relative flex items-center">
        <label htmlFor="carpark-search-input" className="sr-only">
          Search carparks by name
        </label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="carpark-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          className="w-full min-h-[42px] pl-9 pr-9 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/80 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
        />
        {isFiltering && (
          <button
            type="button"
            id="clear-search-btn"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isFiltering && totalCount !== undefined && filteredCount !== undefined && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1 font-medium">
          <span>
            Found {filteredCount} {filteredCount === 1 ? 'carpark' : 'carparks'} matching &ldquo;{searchQuery}&rdquo;
          </span>
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
};

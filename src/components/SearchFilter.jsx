// Search and Filter components
import React from 'react';

function Icon({ name }) {
  const ICON_MAP = {
    search: <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.6" y2="16.6" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    chevronDown: <path d="M6 9l6 6 6-6" />,
  };

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICON_MAP[name]}
    </svg>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search...', onClear }) {
  return (
    <div className="search-bar-wrapper">
      <div className="search-bar-input-group">
        <Icon name="search" />
        <input
          type="text"
          className="search-bar-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            className="search-bar-clear"
            onClick={() => {
              onChange('');
              onClear?.();
            }}
            title="Clear search"
          >
            <Icon name="x" />
          </button>
        )}
      </div>
    </div>
  );
}

export function FilterBar({ filters, onFilterChange, onReset, filterOptions = {} }) {
  return (
    <div className="filter-bar-wrapper">
      <div className="filter-controls">
        {Object.entries(filterOptions).map(([key, options]) => (
          <div key={key} className="filter-select-group">
            <label className="filter-label">{key}</label>
            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={filters[key] || ''}
                onChange={(e) => onFilterChange(key, e.target.value || null)}
              >
                <option value="">All</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" />
            </div>
          </div>
        ))}
        
        {Object.values(filters).some((v) => v) && (
          <button className="filter-reset-btn" onClick={onReset}>
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
}

export function SearchAndFilter({
  searchValue,
  onSearchChange,
  filters,
  onFilterChange,
  onReset,
  filterOptions = {},
  searchPlaceholder = 'Search...',
}) {
  return (
    <div className="search-filter-container">
      <SearchBar
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
      <FilterBar
        filters={filters}
        onFilterChange={onFilterChange}
        onReset={onReset}
        filterOptions={filterOptions}
      />
    </div>
  );
}

// Custom hooks for common data operations
import { useState, useMemo } from 'react';

export function usePagination(items, initialPerPage = 50) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialPerPage);

  const pagination = useMemo(() => {
    const total = items.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paged = items.slice(start, end);

    return {
      items: paged,
      page,
      perPage,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }, [items, page, perPage]);

  return {
    ...pagination,
    setPage: (p) => setPage(Math.max(1, p)),
    setPerPage: (pp) => {
      setPerPage(pp);
      setPage(1);
    },
  };
}

export function useSearch(items, searchFields = [], searchValue = '') {
  return useMemo(() => {
    if (!searchValue.trim()) return items;

    const query = searchValue.toLowerCase().trim();
    return items.filter((item) =>
      searchFields.some((field) =>
        String(item[field] || '').toLowerCase().includes(query)
      )
    );
  }, [items, searchValue, searchFields]);
}

export function useFilter(items, filters = {}, filterFunctions = {}) {
  return useMemo(() => {
    return items.filter((item) => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === null || value === undefined || value === '') continue;

        if (filterFunctions[key]) {
          if (!filterFunctions[key](item[key], value)) return false;
        } else if (item[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }, [items, filters, filterFunctions]);
}

export function useSort(items, sortBy = '', sortOrder = 'asc') {
  return useMemo(() => {
    if (!sortBy) return items;

    const sorted = [...items].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortOrder === 'asc' ? 1 : -1;
      if (bVal == null) return sortOrder === 'asc' ? -1 : 1;

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      const diff = Number(aVal) - Number(bVal);
      return sortOrder === 'asc' ? diff : -diff;
    });

    return sorted;
  }, [items, sortBy, sortOrder]);
}

export function useDataManager(items, options = {}) {
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState(options.defaultSortBy || '');
  const [sortOrder, setSortOrder] = useState(options.defaultSortOrder || 'asc');

  const searchedItems = useSearch(items, options.searchFields || [], searchValue);
  const filteredItems = useFilter(searchedItems, filters, options.filterFunctions);
  const sortedItems = useSort(filteredItems, sortBy, sortOrder);
  const paginated = usePagination(sortedItems, options.perPage || 50);

  return {
    searchValue,
    setSearchValue,
    filters,
    setFilter: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })),
    resetFilters: () => setFilters({}),
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    toggleSort: (field) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('asc');
      }
    },
    ...paginated,
  };
}

// Hook for form auto-save to localStorage
export function useAutoSave(data, key, debounceMs = 1000) {
  const [savedAt, setSavedAt] = useState(null);

  const React = require('react');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        setSavedAt(new Date());
      } catch (e) {
        console.error('Failed to auto-save:', e);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [data, key, debounceMs]);

  const getSavedData = () => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to retrieve saved data:', e);
      return null;
    }
  };

  const clearSavedData = () => {
    try {
      localStorage.removeItem(key);
      setSavedAt(null);
    } catch (e) {
      console.error('Failed to clear saved data:', e);
    }
  };

  return { savedAt, getSavedData, clearSavedData };
}

// Hook for debounced value
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  const React = require('react');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

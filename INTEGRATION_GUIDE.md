// INTEGRATION GUIDE: How to Use New Components & Hooks in App.jsx
// 
// This file shows practical examples of integrating the new reusable components
// and hooks into the existing App.jsx pages.

// ============================================================================
// EXAMPLE 1: PropertiesPage with Search, Filter & Pagination
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useDataManager } from './hooks/useDataManager.js';
import { SearchAndFilter } from './components/SearchFilter.jsx';
import { Pagination } from './components/Pagination.jsx';
import { SkeletonLoader } from './components/SkeletonLoader.jsx';
import './components/components.css';
import './App.css';

function PropertiesPageV2({ properties, onEdit, onDelete, onSelectProperty }) {
  const [isLoading, setIsLoading] = useState(false);

  const manager = useDataManager(properties, {
    searchFields: ['name', 'address', 'city', 'ownerName'],
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    perPage: 25,
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Properties</h2>
        <button onClick={() => onSelectProperty(null)} className="btn btn-primary">
          + Add Property
        </button>
      </div>

      <SearchAndFilter
        searchValue={manager.searchValue}
        onSearchChange={manager.setSearchValue}
        filters={manager.filters}
        onFilterChange={manager.setFilter}
        onReset={manager.resetFilters}
        filterOptions={{
          'Status': ['Available', 'Occupied'],
          'Type': ['House', 'Office', 'Complex', 'Apartment'],
        }}
        searchPlaceholder="Search by name, address, city..."
      />

      {isLoading && <SkeletonLoader type="table" count={5} />}

      {!isLoading && manager.items.length === 0 && (
        <div className="empty-state">
          <p>No properties match your search.</p>
          <button onClick={() => manager.resetFilters()}>Clear filters</button>
        </div>
      )}

      {!isLoading && manager.items.length > 0 && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => manager.toggleSort('name')} className="sortable">
                  Name {manager.sortBy === 'name' && (manager.sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Type</th>
                <th>City</th>
                <th>Status</th>
                <th>Rent Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {manager.items.map((property) => (
                <tr key={property.id}>
                  <td>{property.name}</td>
                  <td>{property.type}</td>
                  <td>{property.city || '—'}</td>
                  <td>
                    <span className={`badge badge-${property.status.toLowerCase()}`}>
                      {property.status}
                    </span>
                  </td>
                  <td>₹{Number(property.rentAmount || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <button onClick={() => onEdit(property)} className="btn-icon" title="Edit">
                      ✎
                    </button>
                    <button onClick={() => onDelete(property.id)} className="btn-icon danger" title="Delete">
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={manager.page}
            totalPages={manager.totalPages}
            onPageChange={manager.setPage}
            perPage={manager.perPage}
            totalItems={manager.total}
            onPerPageChange={manager.setPerPage}
          />
        </>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: TenantsPage with Auto-Save Form
// ============================================================================

import { useAutoSave } from './hooks/useDataManager.js';

function TenantFormV2({ initialTenant, onSave, onCancel }) {
  const [formData, setFormData] = useState(initialTenant || {});
  const [errors, setErrors] = useState({});

  const { savedAt, getSavedData, clearSavedData } = useAutoSave(formData, 'tenantForm', 1000);

  // Recover form if user left the page without saving
  useEffect(() => {
    if (!initialTenant) {
      const saved = getSavedData();
      if (saved) {
        const shouldRecover = confirm(
          'You have an unsaved form. Would you like to recover it?'
        );
        if (shouldRecover) {
          setFormData(saved);
        } else {
          clearSavedData();
        }
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
    clearSavedData();
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          placeholder="Tenant name"
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label>Email *</label>
        <input
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={handleChange}
          placeholder="Tenant email"
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label>Phone *</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone || ''}
          onChange={handleChange}
          placeholder="Tenant phone"
        />
        {errors.phone && <span className="error">{errors.phone}</span>}
      </div>

      {savedAt && (
        <div className="auto-save-notice">
          ✓ Auto-saved at {savedAt.toLocaleTimeString()}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Save Tenant</button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

// ============================================================================
// EXAMPLE 3: RentRecordsPage with Debounced Search
// ============================================================================

import { useDebounce } from './hooks/useDataManager.js';

function RentRecordsPageV2({ rentRecords, tenants, properties }) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);

  const manager = useDataManager(rentRecords, {
    searchFields: ['month', 'status'],
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    perPage: 50,
  });

  // Update search when debounced value changes
  useEffect(() => {
    manager.setSearchValue(debouncedSearch);
  }, [debouncedSearch]);

  const getTenantName = (tenantId) => {
    return tenants.find((t) => t.id === tenantId)?.name || 'Unknown';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Rent Records</h2>
      </div>

      <SearchAndFilter
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        filters={manager.filters}
        onFilterChange={manager.setFilter}
        onReset={() => {
          manager.resetFilters();
          setSearchInput('');
        }}
        filterOptions={{
          'Month': ['January', 'February', /* ... */ 'December'],
          'Status': ['Paid', 'Pending', 'Overdue'],
        }}
        searchPlaceholder="Search rent records..."
      />

      {manager.items.length === 0 ? (
        <div className="empty-state">
          <p>No rent records found.</p>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {manager.items.map((record) => (
                <tr key={record.id}>
                  <td>{getTenantName(record.tenantId)}</td>
                  <td>{record.month}</td>
                  <td>₹{Number(record.amount || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`badge badge-${record.status.toLowerCase()}`}>
                      {record.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon">✎</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={manager.page}
            totalPages={manager.totalPages}
            onPageChange={manager.setPage}
            perPage={manager.perPage}
            totalItems={manager.total}
            onPerPageChange={manager.setPerPage}
          />
        </>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Using Validation Functions
// ============================================================================

import {
  validateEmail,
  validatePhone,
  validateCurrency,
  sanitizeFileName,
  aggregateRentByMonth,
  exportToCSV,
} from './validation.js';

function ExampleValidationUsage() {
  const handlePropertySubmit = (formData) => {
    // Validate email
    if (!validateEmail(formData.ownerEmail)) {
      showError('Invalid owner email');
      return;
    }

    // Validate phone
    if (!validatePhone(formData.ownerPhone)) {
      showError('Phone number must have at least 10 digits');
      return;
    }

    // Validate currency
    if (!validateCurrency(formData.rentAmount)) {
      showError('Invalid rent amount');
      return;
    }

    // Process form
    saveProperty(formData);
  };

  const handleExportRent = (rentRecords) => {
    const aggregated = aggregateRentByMonth(rentRecords);

    exportToCSV(aggregated, 'rent-summary.csv', {
      'Month': (row) => row.month,
      'Year': (row) => row.year,
      'Total Rent': (row) => `₹${row.total}`,
      'Collected': (row) => `₹${row.paid}`,
      'Pending': (row) => `₹${row.pending}`,
    });
  };

  const handleFileUpload = (file, e) => {
    const safeName = sanitizeFileName(file.name);
    // Upload with safe filename
    uploadDocument(file, safeName);
  };
}

// ============================================================================
// SUMMARY OF KEY IMPORTS
// ============================================================================

/*
COMPONENTS:
- import { Pagination } from './components/Pagination.jsx';
- import { SearchBar, FilterBar, SearchAndFilter } from './components/SearchFilter.jsx';
- import { SkeletonLoader, LoadingOverlay } from './components/SkeletonLoader.jsx';
- import './components/components.css'; // Don't forget CSS!

HOOKS:
- import { usePagination, useSearch, useFilter, useSort, useDataManager, useAutoSave, useDebounce } from './hooks/useDataManager.js';

VALIDATION & UTILITIES:
- import { validateEmail, validatePhone, validateCurrency, sanitizeString, aggregateRentByMonth, exportToCSV, handleAPIError } from './validation.js';

BACKEND MIDDLEWARE (for Express):
- import { loginLimiter, createLimiter, deleteLimiter } from './middleware.js';
- import { successResponse, errorResponse, paginatedResponse } from './middleware.js';
- import { auditMiddleware, securityHeaders } from './middleware.js';
*/

export { PropertiesPageV2, TenantFormV2, RentRecordsPageV2 };

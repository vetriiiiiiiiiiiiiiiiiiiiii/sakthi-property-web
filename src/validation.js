// Utility functions for enhanced data validation and processing
// Used across the app for better security and data handling

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function validatePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10;
}

export function validatePropertyName(name) {
  const trimmed = String(name || '').trim();
  return trimmed.length >= 2 && trimmed.length <= 200;
}

export function validateTenantName(name) {
  const trimmed = String(name || '').trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

export function validateCurrency(amount) {
  const num = Number(amount);
  return !isNaN(num) && num >= 0 && num <= 9999999999;
}

export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) return true;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}

// Format validation messages
export function getValidationError(field, value, rule) {
  const fieldLabel = field.replace(/([A-Z])/g, ' $1').toLowerCase();
  
  if (rule === 'required') return `${fieldLabel} is required`;
  if (rule === 'email') return 'Please enter a valid email address';
  if (rule === 'phone') return 'Please enter a valid phone number (10+ digits)';
  if (rule === 'minLength') return `${fieldLabel} must be at least 2 characters`;
  if (rule === 'maxLength') return `${fieldLabel} exceeds maximum length`;
  if (rule === 'currency') return 'Please enter a valid amount';
  if (rule === 'dateRange') return 'End date must be after start date';
  
  return `Invalid ${fieldLabel}`;
}

// Safe string operations
export function truncateString(str, maxLen = 100) {
  const s = String(str || '');
  return s.length > maxLen ? s.slice(0, maxLen) + '...' : s;
}

export function sanitizeFileName(name) {
  return String(name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

// Data aggregation helpers
export function aggregateRentByMonth(rentRecords) {
  const grouped = {};
  
  (rentRecords || []).forEach((r) => {
    const key = `${r.year}-${r.month}`;
    if (!grouped[key]) {
      grouped[key] = { month: r.month, year: r.year, total: 0, paid: 0, pending: 0 };
    }
    const amount = Number(r.amount || 0);
    grouped[key].total += amount;
    if (r.status === 'Paid') {
      grouped[key].paid += amount;
    } else {
      grouped[key].pending += amount;
    }
  });
  
  return Object.values(grouped).sort((a, b) => {
    const aYear = Number(a.year);
    const bYear = Number(b.year);
    if (aYear !== bYear) return aYear - bYear;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months.indexOf(a.month) - months.indexOf(b.month);
  });
}

export function aggregatePropertyMetrics(properties, tenants, rentRecords) {
  const metrics = {};
  
  properties.forEach((p) => {
    metrics[p.id] = {
      property: p,
      currentTenant: null,
      previousTenants: [],
      totalRentCollected: 0,
      pendingRent: 0,
      occupancyRate: p.status === 'Occupied' ? 100 : 0,
    };
  });
  
  tenants.forEach((t) => {
    if (metrics[t.propertyId]) {
      if (t.status === 'Active') {
        metrics[t.propertyId].currentTenant = t;
      } else {
        metrics[t.propertyId].previousTenants.push(t);
      }
    }
  });
  
  rentRecords.forEach((r) => {
    const propId = tenants.find((t) => t.id === r.tenantId)?.propertyId;
    if (propId && metrics[propId]) {
      const amount = Number(r.amount || 0);
      if (r.status === 'Paid') {
        metrics[propId].totalRentCollected += amount;
      } else {
        metrics[propId].pendingRent += amount;
      }
    }
  });
  
  return metrics;
}

// Pagination helper
export function paginate(items, page = 1, perPage = 50) {
  const total = items.length;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paged = items.slice(start, end);
  const totalPages = Math.ceil(total / perPage);
  
  return {
    items: paged,
    page,
    perPage,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// Search helper
export function searchItems(items, query, fields) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return items;
  
  return items.filter((item) => {
    return fields.some((field) => {
      const value = String(item[field] || '').toLowerCase();
      return value.includes(q);
    });
  });
}

// Filter helper
export function filterItems(items, filters) {
  return items.filter((item) => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === null || value === undefined || value === '') return true;
      return item[key] === value;
    });
  });
}

// Sort helper
export function sortItems(items, sortBy, sortOrder = 'asc') {
  const sorted = [...items].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (typeof aVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  return sorted;
}

// Export to CSV
export function exportToCSV(items, filename, fields) {
  if (!items.length) return;
  
  const headers = Object.keys(fields);
  const rows = items.map((item) =>
    headers.map((h) => {
      const value = fields[h](item);
      const str = String(value || '');
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  const csv = [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Audit log formatter
export function formatAuditLog(action, entity, changes) {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    action, // 'CREATE', 'UPDATE', 'DELETE'
    entity, // 'property', 'tenant', 'rentRecord', etc.
    changes, // { field: { old, new } }
    user: 'system', // will be set by server
  };
}

// Error handler
export class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

export function handleAPIError(error) {
  if (error.status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (error.status === 404) {
    return 'The requested item was not found.';
  }
  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (error.status >= 500) {
    return 'Server error. Please try again later.';
  }
  return error.message || 'An unexpected error occurred.';
}

# Sakthi Property Management - Developer Guide

## Project Structure

This document outlines the new modular structure added to improve maintainability, security, and user experience.

### Frontend Structure

```
src/
├── App.jsx                 # Main application component
├── App.css                # Global styles
├── authApi.js             # Authentication API client
├── dataApi.js             # Data API client
├── validation.js          # Form validation & data utilities
├── components/
│   ├── Pagination.jsx     # Pagination component
│   ├── SearchFilter.jsx   # Search & filter UI components
│   ├── SkeletonLoader.jsx # Loading skeletons
│   └── components.css     # Component-specific styles
├── hooks/
│   └── useDataManager.js  # Custom hooks for data operations
└── pages/                 # Page components (under development)
    ├── DashboardPage.jsx
    ├── PropertiesPage.jsx
    └── ...more pages
```

### Backend Structure

```
server/
├── src/
│   ├── server.js          # Express app setup & API routes
│   ├── auth.js            # Authentication logic & audit logging
│   ├── prisma.js          # Prisma client
│   └── middleware.js      # Security & utility middleware
├── prisma/
│   └── schema.prisma      # Database schema
└── .env.example           # Environment variables template
```

## Key Improvements

### 1. Data Management & Validation (`src/validation.js`)

**New Validation Functions:**
- Email, phone, currency validation
- String sanitization
- Property/tenant name validation
- Date range validation

**Usage Example:**
```javascript
import { validateEmail, validatePhone, sanitizeFileName } from './validation.js';

if (!validateEmail(email)) {
  setError('Invalid email address');
}

const filename = sanitizeFileName(userInput); // Safe for file operations
```

**Data Aggregation Helpers:**
```javascript
import { aggregateRentByMonth, aggregatePropertyMetrics } from './validation.js';

const monthlyRent = aggregateRentByMonth(rentRecords);
const metrics = aggregatePropertyMetrics(properties, tenants, rentRecords);
```

### 2. Reusable Components

#### Pagination Component (`src/components/Pagination.jsx`)

```javascript
import { Pagination } from './components/Pagination.jsx';

<Pagination 
  page={currentPage}
  totalPages={totalPages}
  onPageChange={setPage}
  perPage={perPage}
  totalItems={totalItems}
  onPerPageChange={setPerPage}
/>
```

**Features:**
- Smart page number generation (shows 5 pages at a time)
- Items per page dropdown
- Disabled states for first/last page
- Mobile responsive

#### Search & Filter Components (`src/components/SearchFilter.jsx`)

```javascript
import { SearchAndFilter } from './components/SearchFilter.jsx';

<SearchAndFilter
  searchValue={search}
  onSearchChange={setSearch}
  filters={filters}
  onFilterChange={(key, value) => setFilter(key, value)}
  onReset={resetFilters}
  filterOptions={{
    'Status': ['Active', 'Inactive'],
    'Type': ['House', 'Office', 'Complex'],
  }}
  searchPlaceholder="Search properties..."
/>
```

**Features:**
- Type-ahead search with debouncing
- Multiple filter dropdowns
- Reset filters button
- Mobile responsive

#### Skeleton Loader Component (`src/components/SkeletonLoader.jsx`)

```javascript
import { SkeletonLoader, LoadingOverlay } from './components/SkeletonLoader.jsx';

// Skeleton cards while data loads
{isLoading && <SkeletonLoader type="card" count={6} />}
{!isLoading && <PropertiesList properties={properties} />}

// Overlay for important operations
{isSaving && <LoadingOverlay message="Saving changes..." />}
```

**Types:** `card`, `table`, `form`, `block`

### 3. Custom Hooks (`src/hooks/useDataManager.js`)

#### Pagination Hook
```javascript
import { usePagination } from './hooks/useDataManager.js';

const { items, page, totalPages, setPage, ...pagination } = usePagination(allItems, 50);
```

#### Search Hook
```javascript
import { useSearch } from './hooks/useDataManager.js';

const filtered = useSearch(properties, ['name', 'address'], searchQuery);
```

#### Filter Hook
```javascript
import { useFilter } from './hooks/useDataManager.js';

const filtered = useFilter(properties, { status: 'Active', type: 'House' });
```

#### Full Data Manager Hook (Recommended)
```javascript
import { useDataManager } from './hooks/useDataManager.js';

const manager = useDataManager(properties, {
  searchFields: ['name', 'address'],
  defaultSortBy: 'createdAt',
  defaultSortOrder: 'desc',
  perPage: 25,
});

// Then use:
// manager.items - current page items
// manager.searchValue, manager.setSearchValue
// manager.filters, manager.setFilter
// manager.page, manager.setPage
// manager.sortBy, manager.setSortBy
// manager.toggleSort(field)
```

#### Auto-Save Hook
```javascript
import { useAutoSave } from './hooks/useDataManager.js';

const { savedAt, getSavedData, clearSavedData } = useAutoSave(formData, 'propertyForm', 1000);
```

#### Debounce Hook
```javascript
import { useDebounce } from './hooks/useDataManager.js';

const debouncedSearch = useDebounce(searchInput, 500);
```

## Backend Improvements

### 1. Security Middleware (`server/middleware.js`)

**Rate Limiting:**
```javascript
import { loginLimiter, createLimiter, deleteLimiter, uploadLimiter } from './middleware.js';

app.post('/api/auth/login', loginLimiter, (req, res) => { /* ... */ });
app.post('/api/properties', createLimiter, (req, res) => { /* ... */ });
```

**Input Validation:**
```javascript
import { validateRequiredFields, validateEmailFormat, validateCurrencyAmount } from './middleware.js';

validateRequiredFields(res, { email, amount }, ['email', 'amount']);
if (!validateEmailFormat(email)) { /* handle error */ }
if (!validateCurrencyAmount(amount)) { /* handle error */ }
```

**Response Standardization:**
```javascript
import { successResponse, errorResponse, paginatedResponse } from './middleware.js';

successResponse(res, { id: 123, name: 'Property' }, 201);
errorResponse(res, 'Invalid input', 400, 'VALIDATION_ERROR');
paginatedResponse(res, items, page, perPage, total);
```

**Security Headers:**
```javascript
import { securityHeaders } from './middleware.js';
app.use(securityHeaders);
```

### 2. Audit Logging

Audit logs are automatically created for:
- Login attempts (success/failure)
- Password resets
- All data mutations (coming soon)

**Log Location:** `server/logs/audit-YYYY-MM-DD.log`

**Log Format:**
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "action": "LOGIN_SUCCESS",
  "username": "admin@example.com",
  "adminId": "123456",
  "ip": "192.168.1.100"
}
```

**Using in Code:**
```javascript
import { logAudit } from './auth.js';

await logAudit('CUSTOM_ACTION', { userId: admin.id, details: 'something' });
```

### 3. Error Handling

Global error handler catches and logs all errors:
```javascript
// Automatic handling of Prisma errors:
// P2025 → 404 Not Found
// P2002 → 409 Conflict (unique constraint)
// P2014, P2003 → 400 Bad Request (FK constraint)
```

### 4. Health Check Endpoint

```bash
curl http://localhost:5000/api/health
# Returns: { "success": true, "status": "healthy", "timestamp": "..." }
```

## Usage Examples

### Property List with Search, Filter & Pagination

```javascript
import { useDataManager } from './hooks/useDataManager.js';
import { SearchAndFilter } from './components/SearchFilter.jsx';
import { Pagination } from './components/Pagination.jsx';

export function PropertiesPage({ properties }) {
  const manager = useDataManager(properties, {
    searchFields: ['name', 'address', 'city'],
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    perPage: 25,
  });

  return (
    <>
      <SearchAndFilter
        searchValue={manager.searchValue}
        onSearchChange={manager.setSearchValue}
        filters={manager.filters}
        onFilterChange={manager.setFilter}
        onReset={manager.resetFilters}
        filterOptions={{
          'Status': ['Available', 'Occupied'],
          'Type': ['House', 'Office', 'Complex'],
        }}
      />
      
      <PropertiesList properties={manager.items} />
      
      <Pagination
        page={manager.page}
        totalPages={manager.totalPages}
        onPageChange={manager.setPage}
        perPage={manager.perPage}
        totalItems={manager.total}
        onPerPageChange={manager.setPerPage}
      />
    </>
  );
}
```

### Form with Auto-Save

```javascript
import { useAutoSave } from './hooks/useDataManager.js';

export function PropertyForm() {
  const [data, setData] = useState({});
  const { savedAt, getSavedData, clearSavedData } = useAutoSave(data, 'propertyForm');

  useEffect(() => {
    // Recover form if there's a saved draft
    const saved = getSavedData();
    if (saved) {
      setData(saved);
    }
  }, []);

  return (
    <>
      {/* Form fields */}
      {savedAt && <p>Auto-saved at {savedAt.toLocaleTimeString()}</p>}
    </>
  );
}
```

## Best Practices

### 1. Component Organization
- Keep components under 400 lines
- Extract reusable logic into custom hooks
- Use the provided component library for consistency
- Import components.css where needed

### 2. Data Fetching
- Use `usePagination` for large lists (50+ items)
- Show `SkeletonLoader` while data is loading
- Handle errors gracefully with user-friendly messages

### 3. Validation
- Always validate on both frontend and backend
- Use the provided validation functions for consistency
- Sanitize user input before using in file operations

### 4. Security
- Don't hardcode sensitive data
- Use environment variables for config
- Validate all user inputs on the backend
- Log important actions for audit trail

### 5. Performance
- Memoize expensive computations with `useMemo`
- Debounce search input (use `useDebounce`)
- Use pagination for large datasets
- Lazy load components with React.lazy (coming soon)

## Testing

Run tests:
```bash
npm test
```

Tests are automatically run when:
- Making changes to components
- Modifying data fetching logic
- Updating validation rules

Current test coverage: 12/12 tests passing ✅

## Next Steps

The following improvements are in progress:
1. Extract remaining page components from App.jsx
2. Add audit log viewer to Settings page
3. Implement bulk operations (select multiple, export)
4. Add keyboard shortcuts and accessibility features
5. Create dark mode support
6. Add mobile-first responsive design
7. Build advanced reporting features

## Troubleshooting

**Search not working?**
- Ensure `searchFields` match your data structure
- Check that fields exist on the data objects

**Pagination showing 0 items?**
- Verify `items` array is not empty
- Check that `perPage` is a positive number

**Audit logs not appearing?**
- Check `server/logs/` directory exists
- Verify write permissions on logs directory
- Check server console for errors

## Questions?

Refer to individual file comments or check the original IMPROVEMENTS.md roadmap.

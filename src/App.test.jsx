import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App, { calculateLandArea, calculateTenantBalances, DashboardPage, TenantsPage } from './App';

test('converts length and breadth to acre, cent, square feet, and kuli', () => {
  expect(calculateLandArea(20, 30)).toEqual({
    squareFeet: 600,
    acres: 600 / 43560,
    cents: 600 / 435.6,
    kuli: 600 / 144,
  });
});

test('renders the Sakthi Property brand', () => {
  render(<App />);
  expect(screen.getByText(/sakthi property/i)).toBeDefined();
});

test('starts with no sample properties, tenants, or rent records', () => {
  render(<App />);
  expect(screen.getByText('No properties yet')).toBeDefined();
  expect(screen.queryByText('Sakthi Residency')).toBeNull();
  expect(screen.queryByText('Anitha Kumar')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Rent Management' }));
  expect(screen.getByText('No current rent records')).toBeDefined();
});

test('land and standard calculators are modes within one section', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Calculator' }));
  expect(screen.queryByRole('button', { name: 'Land calculator' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Standard' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Land area' }));

  fireEvent.change(screen.getByLabelText('Length (feet)'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('Breadth (feet)'), { target: { value: '30' } });

  expect(screen.getByRole('heading', { name: 'Calculator' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Land area calculator' })).toBeDefined();
  expect(screen.getByText('600')).toBeDefined();
});

test('standard calculator performs basic arithmetic', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Calculator' }));

  fireEvent.click(screen.getByRole('button', { name: '1' }));
  fireEvent.click(screen.getByRole('button', { name: '+' }));
  expect(screen.getByLabelText('Pending calculation').textContent).toBe('1 +');

  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(screen.getByRole('button', { name: '=' }));

  expect(screen.getByLabelText('Calculator display').textContent).toBe('3');
});

test('Add Property shows land dimensions without embedding the calculator', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Properties' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Add property' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Land / Site' }));

  expect(screen.getByText('Land dimensions')).toBeDefined();
  expect(screen.queryByText('Land area calculator')).toBeNull();
});

test('previous tenants can download an individual PDF with their own details', () => {
  const previousTenant = {
    id: 'tenant-previous',
    propertyId: 'property-previous',
    fullName: 'Previous Tenant',
    phone: '555-0142',
    status: 'Archived',
    familyCount: 0,
    familyMembers: [{ relation: 'Spouse', name: 'Family Member', phone: '555-0143' }],
    rentHistory: [],
  };
  const property = { id: 'property-previous', name: 'Prior House', address: '12 Main Road', ownerName: 'Property Owner' };
  const popup = { opener: null, document: { write: vi.fn(), close: vi.fn() } };
  const openWindow = vi.spyOn(window, 'open').mockReturnValue(popup);

  render(<TenantsPage
    tenants={[previousTenant]}
    properties={[property]}
    onAdd={() => {}}
    onUpdate={() => {}}
    onArchive={() => {}}
    onRestore={() => {}}
    pushToast={() => {}}
    sendMessage={() => {}}
  />);

  fireEvent.click(screen.getByRole('checkbox', { name: 'Show previous tenants' }));
  fireEvent.click(screen.getByRole('button', { name: 'Download Previous Tenant details PDF' }));

  const report = popup.document.write.mock.calls[0][0];
  expect(report).toContain('Previous Tenant');
  expect(report).toContain('555-0142');
  expect(report).toContain('Prior House');
  expect(report).toContain('Family Member');
  expect(report).toContain('<strong>1</strong>');
  openWindow.mockRestore();
});

test('dashboard rent totals exclude records from other years', () => {
  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const tenants = [{
    id: 'tenant-1',
    fullName: 'Current Tenant',
    status: 'Active',
    rentHistory: [
      { month, year: now.getFullYear() - 1, amount: 9000, status: 'Paid' },
      { month, year: now.getFullYear(), amount: 1200, status: 'Paid' },
      { month, year: now.getFullYear(), amount: 300, status: 'Pending' },
    ],
  }];

  render(<DashboardPage properties={[]} tenants={tenants} bills={[]} notifications={[]} setPage={() => {}} />);

  expect(screen.getByRole('button', { name: /Rent Collected/ }).textContent).toContain('₹1,200');
  expect(screen.getByRole('button', { name: /Rent Pending/ }).textContent).toContain('₹300');
});

test('renders login screen when unauthenticated (initialUser={null})', () => {
  render(<App initialUser={null} />);
  expect(screen.getByRole('region', { name: 'Login form' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Sign In' })).toBeDefined();
  expect(screen.getByLabelText('Username')).toBeDefined();
  expect(screen.getByPlaceholderText('Enter your password')).toBeDefined();
});

test('toggles password visibility on password toggle click', () => {
  render(<App initialUser={null} />);
  const passwordInput = screen.getByPlaceholderText('Enter your password');
  expect(passwordInput.getAttribute('type')).toBe('password');

  const toggleBtn = screen.getByRole('button', { name: 'Show password' });
  fireEvent.click(toggleBtn);
  expect(passwordInput.getAttribute('type')).toBe('text');

  const hideBtn = screen.getByRole('button', { name: 'Hide password' });
  fireEvent.click(hideBtn);
  expect(passwordInput.getAttribute('type')).toBe('password');
});

test('switches to forgot password screen when clicking Forgot password', () => {
  render(<App initialUser={null} />);
  fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));

  expect(screen.getByRole('region', { name: 'Password recovery' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeDefined();
  expect(screen.getByPlaceholderText('admin@sakthiproperty.com')).toBeDefined();

  // Can navigate back to login
  fireEvent.click(screen.getByRole('button', { name: /Back to Sign In/i }));
  expect(screen.getByRole('region', { name: 'Login form' })).toBeDefined();
});

test('logs out and returns to login screen', async () => {
  render(<App initialUser={{ username: 'razi', role: 'Administrator' }} />);
  expect(screen.getByText('Good Morning, Admin')).toBeDefined();

  // Click logout in sidebar
  fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
  await waitFor(() => {
    expect(screen.getByRole('region', { name: 'Login form' })).toBeDefined();
  });
});

test('calculates and tallies carried-forward balance for partial rent payments', () => {
  const tenant = {
    id: 't-1',
    fullName: 'Ravi',
    rentAmount: 8000,
    rentHistory: [
      {
        month: 'January',
        year: 2026,
        amount: 8000,
        totalDue: 8000,
        paidAmount: 7500,
        balanceAmount: 500,
        status: 'Partially Paid',
      },
    ],
  };

  // Next transaction: February 2026
  const balanceInfo = calculateTenantBalances(tenant, 'February', 2026);
  expect(balanceInfo.previousOutstanding).toBe(500);
  expect(balanceInfo.previousUnpaidMonths).toEqual([
    { month: 'January', year: 2026, balance: 500, amount: 8000, paidAmount: 7500 },
  ]);

  // Total due for February will be base rent (8000) + carried balance (500) = 8500
  const febTotalDue = Number(tenant.rentAmount) + balanceInfo.previousOutstanding;
  expect(febTotalDue).toBe(8500);
});

test('dashboard includes Godown and Land in Property Type Overview with click navigation', () => {
  const properties = [
    { id: 'p-1', name: 'South Godown', type: 'Godown', status: 'Occupied' },
    { id: 'p-2', name: 'West Land', type: 'Land', status: 'Available' },
    { id: 'p-3', name: 'City House', type: 'House', status: 'Occupied' },
  ];
  const onNavigateToProperties = vi.fn();

  render(
    <DashboardPage
      properties={properties}
      tenants={[]}
      bills={[]}
      notifications={[]}
      setPage={() => {}}
      onNavigateToProperties={onNavigateToProperties}
    />
  );

  // Property type overview should display Godowns and Lands
  expect(screen.getByText('Godowns')).toBeDefined();
  expect(screen.getByText('Lands')).toBeDefined();

  // Click on Godowns legend item to filter
  fireEvent.click(screen.getByTitle('Filter by Godowns'));
  expect(onNavigateToProperties).toHaveBeenCalledWith({ type: 'Godown', status: 'All' });

  // Click on Occupied Properties card
  fireEvent.click(screen.getByRole('button', { name: /Occupied Properties/ }));
  expect(onNavigateToProperties).toHaveBeenCalledWith({ status: 'Occupied' });

  // Click on Vacant Properties card
  fireEvent.click(screen.getByRole('button', { name: /Vacant Properties/ }));
  expect(onNavigateToProperties).toHaveBeenCalledWith({ status: 'Available' });
});


test('carries a partial rent balance forward once without double counting', () => {
  // Month 1: ₹8,000 due, ₹7,500 paid → ₹500 balance
  const jan = { id: 'r1', month: 'January', year: 2026, amount: 8000, totalDue: 8000, paidAmount: 7500, balanceAmount: 500, status: 'Partially Paid' };
  const afterJan = calculateTenantBalances({ rentHistory: [jan] }, 'February', 2026);
  expect(afterJan.previousOutstanding).toBe(500);

  // Month 2: ₹8,500 due (₹500 carried), ₹8,000 paid → January's balance is rolled into February
  const janCarried = { ...jan, balanceAmount: 0, status: 'Carried Forward' };
  const feb = { id: 'r2', month: 'February', year: 2026, amount: 8000, totalDue: 8500, paidAmount: 8000, balanceAmount: 500, status: 'Partially Paid' };
  const afterFeb = calculateTenantBalances({ rentHistory: [feb, janCarried] }, 'March', 2026);
  expect(afterFeb.previousOutstanding).toBe(500);
  expect(afterFeb.previousUnpaidMonths.map((m) => m.month)).toEqual(['February']);
});

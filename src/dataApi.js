const API_BASE = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    ...options,
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });
const normalizeBill = (bill) => ({ ...bill, month: bill.description || bill.month || '' });

export async function loadRemoteData() {
  const data = await request('/api/data');
  return { ...data, bills: (data.bills || []).map(normalizeBill) };
}
export const createProperty = (value) => request('/api/properties', json('POST', value));
export const updateProperty = (id, value) => request(`/api/properties/${id}`, json('PUT', value));
export const removeProperty = (id) => request(`/api/properties/${id}`, { method: 'DELETE' });
export const createTenant = (value) => request('/api/tenants', json('POST', value));
export const updateTenant = (id, value) => request(`/api/tenants/${id}`, json('PUT', value));
export const setTenantStatus = (id, status) => request(`/api/tenants/${id}/status`, json('PATCH', { status }));
export const createRentRecord = (tenantId, value) => request(`/api/tenants/${tenantId}/rent-records`, json('POST', value));
export const updateRentRecord = (id, value) => request(`/api/rent-records/${id}`, json('PATCH', value));
export async function createBill(value) { return normalizeBill(await request('/api/bills', json('POST', value))); }
export async function updateBill(id, value) { return normalizeBill(await request(`/api/bills/${id}`, json('PATCH', value))); }
export const createMaintenance = (value) => request('/api/maintenance', json('POST', value));
export const updateMaintenance = (id, value) => request(`/api/maintenance/${id}`, json('PATCH', value));

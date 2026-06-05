import { supabase, Tenant, Payment } from './supabase';
import { mockTenants, mockPayments } from './mockData';

let isGuestMode = false;

export const setGuestMode = (isGuest: boolean) => {
  isGuestMode = isGuest;
};

export const getTenants = async (): Promise<Tenant[]> => {
  if (isGuestMode) return [...mockTenants];
  const { data } = await supabase.from('tenants').select('*');
  return data || [];
};

export const getPayments = async (): Promise<Payment[]> => {
  if (isGuestMode) return [...mockPayments];
  const { data } = await supabase.from('payments').select('*');
  return data || [];
};

export const getTenantById = async (id: string): Promise<Tenant | null> => {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUUID) {
    try {
      const { data, error } = await supabase.from('tenants').select('*').eq('id', id).single();
      if (!error && data) return data;
    } catch (e) {
      console.warn("getTenantById Supabase fetch failed:", e);
    }
  }
  if (isGuestMode) return mockTenants.find(t => t.id === id) || null;
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  return data || null;
};

export const getPaymentsByTenantId = async (tenantId: string): Promise<Payment[]> => {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
  if (isUUID) {
    try {
      const { data, error } = await supabase.from('payments').select('*').eq('tenant_id', tenantId);
      if (!error && data) return data;
    } catch (e) {
      console.warn("getPaymentsByTenantId Supabase fetch failed:", e);
    }
  }
  if (isGuestMode) return mockPayments.filter(p => p.tenant_id === tenantId);
  const { data } = await supabase.from('payments').select('*').eq('tenant_id', tenantId);
  return data || [];
};

// For mutations, if guest mode, we can either simulate or just ignore.
// Let's simulate by modifying the mock arrays in memory.
export const addTenant = async (tenant: Partial<Tenant>): Promise<{ error: any }> => {
  if (isGuestMode) {
    const newTenant = { ...tenant, id: crypto.randomUUID() } as Tenant;
    mockTenants.push(newTenant);
    return { error: null };
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('User not authenticated') };

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 15000)
    );

    const insertPromise = supabase.from('tenants').insert({ ...tenant, user_id: user.id });
    
    const response = await Promise.race([insertPromise, timeoutPromise]) as { error: any };
    return { error: response.error };
  } catch (err: any) {
    console.error('addTenant error:', err);
    if (err.message === 'TIMEOUT') return { error: new Error('Database request timed out') };
    return { error: err };
  }
};

export const updateTenant = async (id: string, tenant: Partial<Tenant>): Promise<{ error: any }> => {
  if (isGuestMode) {
    const index = mockTenants.findIndex(t => t.id === id);
    if (index !== -1) {
      mockTenants[index] = { ...mockTenants[index], ...tenant };
    }
    return { error: null };
  }
  return await supabase.from('tenants').update(tenant).eq('id', id);
};

export const deleteTenant = async (id: string): Promise<{ error: any }> => {
  if (isGuestMode) {
    const index = mockTenants.findIndex(t => t.id === id);
    if (index !== -1) mockTenants.splice(index, 1);
    return { error: null };
  }
  return await supabase.from('tenants').delete().eq('id', id);
};

export const deletePaymentsByTenantId = async (tenantId: string): Promise<{ error: any }> => {
  if (isGuestMode) {
    const remaining = mockPayments.filter(p => p.tenant_id !== tenantId);
    mockPayments.length = 0;
    mockPayments.push(...remaining);
    return { error: null };
  }
  return await supabase.from('payments').delete().eq('tenant_id', tenantId);
};

export const addPayment = async (payment: Partial<Payment>): Promise<{ error: any }> => {
  if (isGuestMode) {
    const newPayment = { ...payment, id: crypto.randomUUID() } as Payment;
    mockPayments.push(newPayment);
    return { error: null };
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('User not authenticated') };

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 15000)
    );

    const insertPromise = supabase.from('payments').insert({ ...payment, user_id: user.id });

    const response = await Promise.race([insertPromise, timeoutPromise]) as { error: any };
    return { error: response.error };
  } catch (err: any) {
    console.error('addPayment error:', err);
    if (err.message === 'TIMEOUT') return { error: new Error('Database request timed out') };
    return { error: err };
  }
};

export const getSlipsByTenantId = async (tenantId: string): Promise<any[]> => {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
  if (isUUID) {
    try {
      const { data, error } = await supabase.from('slips').select('*').eq('tenant_id', tenantId);
      if (!error && data) return data;
    } catch (e) {
      console.warn("getSlipsByTenantId Supabase fetch failed:", e);
    }
  }
  if (isGuestMode) return [];
  const { data } = await supabase.from('slips').select('*').eq('tenant_id', tenantId);
  return data || [];
};

export const addSlip = async (slip: any): Promise<{ error: any }> => {
  if (isGuestMode) return { error: null };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('User not authenticated') };

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 15000)
    );

    const insertPromise = supabase.from('slips').insert({ ...slip, user_id: user.id });

    const response = await Promise.race([insertPromise, timeoutPromise]) as { error: any };
    return { error: response.error };
  } catch (err: any) {
    console.error('addSlip error:', err);
    if (err.message === 'TIMEOUT') return { error: new Error('Database request timed out') };
    return { error: err };
  }
};

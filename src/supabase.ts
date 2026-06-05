import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gpccwkbmtflqmnavvpyc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwY2N3a2JtdGZscW1uYXZ2cHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjIzMDgsImV4cCI6MjA5MTk5ODMwOH0.n2FqjubPJxmi8EjRkdvYWoWC8o13eyA347omXdlsvTw';

// Use localStorage to persist session across reloads.
// We provide a fallback just in case localStorage is blocked in some strict iframes.
let storage;
try {
  const testKey = '__test__';
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
  storage = window.localStorage;
} catch (e) {
  console.warn('localStorage not available, falling back to memory storage');
  const memoryStorage: Record<string, string> = {};
  storage = {
    getItem: (key: string) => memoryStorage[key] ?? null,
    setItem: (key: string, value: string) => { memoryStorage[key] = value; },
    removeItem: (key: string) => { delete memoryStorage[key]; },
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});

export interface AppUser {
  id: string;
  email: string;
  name: string;
  profile_picture?: string;
  created_at?: string;
}

export interface Tenant {
  id: string; // Changed to string (UUID)
  user_id: string;
  name: string;
  photo?: string;
  mobile: string;
  nid: string;
  property_type: 'Flat' | 'Shop' | 'Both';
  flat_or_shop_name: string;
  monthly_rent: number;
  due_date: number;
  deposit_amount: number;
  deposit_returned: boolean;
  joining_date: string;
  is_active: boolean;
  created_at?: string;
}

export interface Payment {
  id: string; // Changed to string (UUID)
  tenant_id: string;
  user_id: string;
  amount: number;
  payment_date: number;
  month: string;
  year: string;
  is_completed: boolean;
  created_at?: string;
}

export interface Slip {
  id: string;
  tenant_id: string;
  user_id: string;
  slip_number: string;
  payment_month: string;
  payment_year: string;
  total_amount: number;
  generated_at: string;
}

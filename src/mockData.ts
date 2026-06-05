import { Tenant, Payment } from './supabase';

export const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'John Doe',
    mobile: '01711223344',
    nid: '1234567890',
    property_type: 'Flat',
    flat_or_shop_name: 'A1',
    monthly_rent: 15000,
    due_date: 5,
    deposit_amount: 30000,
    joining_date: '2023-01-01',
    is_active: true,
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
    user_id: 'mock-user-1',
    created_at: new Date().toISOString(),
    deposit_returned: false
  },
  {
    id: '2',
    name: 'James Smith',
    mobile: '01811223344',
    nid: '0987654321',
    property_type: 'Shop',
    flat_or_shop_name: 'S-12',
    monthly_rent: 25000,
    due_date: 10,
    deposit_amount: 50000,
    joining_date: '2023-06-15',
    is_active: true,
    photo: 'https://randomuser.me/api/portraits/men/44.jpg',
    user_id: 'mock-user-1',
    created_at: new Date().toISOString(),
    deposit_returned: false
  }
];

export const mockPayments: Payment[] = [
  {
    id: 'p1',
    tenant_id: '1',
    month: 'Apr',
    year: '2026',
    amount: 15000,
    payment_date: Date.now() - 86400000 * 2,
    user_id: 'mock-user-1',
    created_at: new Date().toISOString(),
    is_completed: true
  }
];

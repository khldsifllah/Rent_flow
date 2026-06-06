import { useState, useEffect } from 'react';
import { type Tenant, type Payment } from '../supabase';
import { getTenants, getPayments } from '../dataService';
import { Link } from 'react-router-dom';
import { User, ChevronRight } from 'lucide-react';
import { format, getDate } from 'date-fns';
import { TenantsSkeleton } from '../components/SkeletonLoader';

type TenantStatus = 'DUE' | 'PENDING' | 'PAID';

export default function Tenants() {
  const [tenantsWithStatus, setTenantsWithStatus] = useState<(Tenant & { status: TenantStatus })[] | null>(null);

  useEffect(() => {
    async function fetchTenants() {
      const allTenantsData = await getTenants();
      const allTenants = allTenantsData.filter(t => t.is_active);
      const allPayments = await getPayments();

      if (!allTenants) return;

      const today = new Date();
      const currentMonth = format(today, 'MMM');
      const currentYear = format(today, 'yyyy');
      const currentDay = getDate(today);

      const tenantsData = allTenants.map((tenant: Tenant) => {
        const tenantPayments = (allPayments || []).filter((p: Payment) => p.tenant_id === tenant.id && p.month === currentMonth && p.year === currentYear);
        const totalPaidThisMonth = tenantPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
        
        let status: TenantStatus = 'PENDING';
        if (totalPaidThisMonth >= tenant.monthly_rent) {
          status = 'PAID';
        } else if (currentDay > tenant.due_date) {
          status = 'DUE';
        }

        return {
          ...tenant,
          status
        };
      });

      // Sort: DUE first, then PENDING, then PAID
      tenantsData.sort((a, b) => {
        const statusOrder = { 'DUE': 0, 'PENDING': 1, 'PAID': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setTenantsWithStatus(tenantsData);
    }

    fetchTenants();
  }, []);

  if (!tenantsWithStatus) return <TenantsSkeleton />;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-m3-on-surface">Active Tenants</h1>
      
      {tenantsWithStatus.length === 0 ? (
        <div className="text-center py-12 bg-m3-surface rounded-3xl border border-m3-surface-variant">
          <p className="text-m3-on-surface-variant">No active tenants found.</p>
          <Link to="/admin" className="text-m3-primary font-bold mt-3 inline-block hover:underline">Add one in Admin panel</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenantsWithStatus.map(tenant => (
            <Link 
              key={tenant.id} 
              to={`/tenants/${tenant.id}`}
              className="block bg-m3-surface border border-m3-surface-variant rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className="flex items-center">
                <div className="w-14 h-14 bg-m3-primary-container text-m3-on-primary-container rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {tenant.photo ? (
                    <img src={tenant.photo} alt={tenant.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-m3-on-surface">{tenant.name}</h3>
                    {tenant.status === 'PAID' && (
                      <span className="bg-m3-success-container text-m3-on-success-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Paid
                      </span>
                    )}
                    {tenant.status === 'DUE' && (
                      <span className="bg-m3-error-container text-m3-on-error-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Due
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-m3-on-surface-variant font-medium">
                    {tenant.flat_or_shop_name} • Rent: ৳{tenant.monthly_rent}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center group-hover:bg-m3-surface-variant transition-colors">
                  <ChevronRight className="w-6 h-6 text-m3-on-surface-variant" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

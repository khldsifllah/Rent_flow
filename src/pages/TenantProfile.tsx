import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, type Tenant, type Payment } from '../supabase';
import { getTenantById, getPaymentsByTenantId, getSlipsByTenantId } from '../dataService';
import { ArrowLeft, User, ReceiptText, ChevronDown, Banknote, Plus } from 'lucide-react';
import { format, parse } from 'date-fns';
import SlipDialog from '../components/SlipDialog';
import AddPaymentModal from '../components/AddPaymentModal';
import { useAuth } from '../AuthContext';

export default function TenantProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = id || '';

  const [data, setData] = useState<{ tenant: Tenant; payments: Payment[]; totalPaid: number; slips: any[] } | null | undefined>(undefined);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [landlordRealName, setLandlordRealName] = useState('Landlord');
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  async function fetchTenantData() {
    if (!tenantId) return;

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      setData(null);
      return;
    }

    // Query landlord's real name from 'users' table
    let lName = user?.name || 'Owner';
    if (tenant.user_id) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', tenant.user_id)
          .single();
        if (userData && userData.name) {
          lName = userData.name;
        }
      } catch (err) {
        console.warn("Failed to fetch landlord name from users table:", err);
      }
    }
    setLandlordRealName(lName);

    const paymentsData = await getPaymentsByTenantId(tenantId);
    const payments = (paymentsData || []).sort((a, b) => b.payment_date - a.payment_date);

    const slipsData = await getSlipsByTenantId(tenantId);

    const totalPaid = (payments || []).reduce((sum: number, p: Payment) => sum + p.amount, 0);

    setData({ tenant, payments: payments || [], totalPaid, slips: slipsData || [] });
  }

  useEffect(() => {
    fetchTenantData();
  }, [tenantId]);

  if (data === undefined) return <div className="p-4">Loading...</div>;
  if (data === null) return <div className="p-4">Tenant not found</div>;

  const { tenant, payments, totalPaid } = data;

  const formatMonthYear = (m: string, y: string) => {
    return `${m} ${y}`;
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const groupedPayments = payments.reduce((acc: any[], payment) => {
    const key = `${payment.month}-${payment.year}`;
    let group = acc.find(g => g.key === key);
    if (!group) {
      const relatedSlip = data.slips?.find((s: any) => s.payment_month === payment.month && s.payment_year === payment.year);
      group = {
        key,
        month: payment.month,
        year: payment.year,
        total: 0,
        isCompleted: false,
        installments: [],
        slip: relatedSlip
      };
      acc.push(group);
    }
    group.installments.push(payment);
    group.total += payment.amount;
    if (payment.is_completed) group.isCompleted = true;
    return acc;
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="mr-3 p-2 rounded-full hover:bg-m3-surface-variant transition-colors">
          <ArrowLeft className="w-6 h-6 text-m3-on-surface" />
        </button>
        <h1 className="text-3xl font-bold text-m3-on-surface">Tenant Profile</h1>
      </div>

      <div className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-m3-primary-container text-m3-on-primary-container rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {tenant.photo ? (
                <img src={tenant.photo} alt={tenant.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8" />
              )}
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-m3-on-surface">{tenant.name}</h2>
            </div>
          </div>
          <span className={`px-4 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${tenant.is_active ? 'bg-m3-success-container text-m3-on-success-container' : 'bg-m3-error-container text-m3-on-error-container'}`}>
            {tenant.is_active ? 'Active' : 'Moved Out'}
          </span>
        </div>
        
        <div className="space-y-3 text-sm text-m3-on-surface-variant">
          <div className="flex justify-between"><span className="font-medium">Mobile:</span> <span>{tenant.mobile || 'nul'}</span></div>
          <div className="flex justify-between"><span className="font-medium">NID:</span> <span>{tenant.nid || 'nul'}</span></div>
          <div className="flex justify-between items-center">
            <span className="font-medium">{tenant.property_type === 'Both' ? 'Flat & Shop:' : tenant.property_type ? `${tenant.property_type}:` : 'Flat/Shop name:'}</span> 
            <span>{tenant.flat_or_shop_name || 'nul'}</span>
          </div>
          <div className="flex justify-between"><span className="font-medium">Monthly Rent:</span> <span className="font-bold text-m3-on-surface text-base">{tenant.monthly_rent ? `৳${tenant.monthly_rent}` : 'nul'}</span></div>
          <div className="flex justify-between"><span className="font-medium">Advance Deposit:</span> <span className="font-bold text-m3-success text-base">{tenant.deposit_amount ? `৳${tenant.deposit_amount}` : 'nul'}</span></div>
          <div className="flex justify-between"><span className="font-medium">Join Date:</span> <span>{tenant.joining_date ? format(new Date(tenant.joining_date), 'dd MMM yyyy') : 'nul'}</span></div>
          <div className="flex justify-between"><span className="font-medium">Due Date:</span> <span>{tenant.due_date ? `${tenant.due_date}th of month` : 'nul'}</span></div>
        </div>
      </div>

      <div className="bg-m3-secondary-container text-m3-on-secondary-container rounded-3xl p-6 shadow-sm mb-6">
        <h3 className="text-xl font-bold mb-4">Payment Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm opacity-80 font-medium">Total Paid (All Time)</span>
            <span className="text-3xl font-bold">৳{totalPaid.toFixed(2)}</span>
          </div>
          {payments.length > 0 && (
            <div className="flex justify-between items-center pt-4 border-t border-m3-on-secondary-container/10">
              <span className="text-sm opacity-80 font-medium">Last Payment</span>
              <span className="text-sm font-bold text-right">{format(new Date(payments[0].payment_date), 'MMM dd, yyyy')}</span>
            </div>
          )}
          
          <button
            onClick={() => setIsAddPaymentOpen(true)}
            className="w-full mt-4 bg-m3-primary text-m3-on-primary hover:bg-opacity-90 active:scale-[0.98] font-bold rounded-full py-3.5 px-4 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-md text-sm uppercase tracking-wider cursor-pointer"
          >
            <Banknote className="w-5 h-5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      <h3 className="text-xl font-bold text-m3-on-surface mb-4">Payment History</h3>
      {groupedPayments.length === 0 ? (
        <div className="text-center py-10 bg-m3-surface rounded-3xl border border-m3-surface-variant">
          <p className="text-m3-on-surface-variant">No payments recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedPayments.map((group: any) => {
            const isExpanded = expandedMonths[group.key];
            
            return (
              <div key={group.key} className="bg-m3-surface border border-m3-surface-variant rounded-2xl overflow-hidden shadow-sm">
                {/* Month Header */}
                <div 
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-m3-surface-variant/50 transition-colors"
                  onClick={() => toggleMonth(group.key)}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-m3-on-surface text-lg flex items-center gap-2">
                      {formatMonthYear(group.month, group.year)}
                      <ChevronDown className={`w-5 h-5 text-m3-on-surface-variant transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </p>
                    {group.isCompleted && <span className="bg-m3-success/20 text-m3-success text-xs px-2 py-1 rounded-md font-bold">✅</span>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {group.isCompleted && group.slip && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSlip({
                            landlordName: landlordRealName,
                            tenantName: tenant.name,
                            flatName: tenant.flat_or_shop_name,
                            monthlyRent: tenant.monthly_rent,
                            amountPaid: group.slip.total_amount,
                            billingMonth: group.slip.payment_month,
                            billingYear: group.slip.payment_year,
                            datePaid: new Date(group.slip.generated_at).getTime(),
                            slipNumber: group.slip.slip_number,
                            propertyType: tenant.property_type,
                            paymentStatus: 'CLEARED'
                          });
                        }}
                        className="p-2 bg-m3-primary/10 text-m3-primary hover:bg-m3-primary/20 rounded-full transition-colors"
                        title="View Slip"
                      >
                        <ReceiptText className="w-5 h-5" />
                      </button>
                    )}
                    <span className="text-lg font-bold text-m3-primary">৳{group.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Expanded Installments */}
                {isExpanded && group.installments.length > 0 && (
                  <div className="bg-m3-surface-variant/20 p-4 border-t border-m3-surface-variant space-y-2">
                    {group.installments.map((inst: any, idx: number) => (
                      <div key={inst.id || idx} className="flex justify-between items-center text-sm text-m3-on-surface-variant pl-2 border-l-2 border-m3-primary/30">
                        <span className="font-medium">{format(new Date(inst.payment_date), 'dd MMM')} <span className="mx-2 text-m3-primary/40">→</span></span>
                        <span className="font-bold text-m3-on-surface">৳{inst.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Slip Viewer */}
      <SlipDialog 
        slipData={selectedSlip} 
        isOpen={!!selectedSlip} 
        onClose={() => setSelectedSlip(null)} 
      />

      <AddPaymentModal
        isOpen={isAddPaymentOpen}
        onClose={() => setIsAddPaymentOpen(false)}
        onSuccess={() => fetchTenantData()}
        preselectedTenantId={tenantId}
      />
    </div>
  );
}

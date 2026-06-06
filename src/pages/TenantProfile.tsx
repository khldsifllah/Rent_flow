import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, type Tenant, type Payment } from '../supabase';
import { getTenantById, getPaymentsByTenantId, getSlipsByTenantId } from '../dataService';
import { 
  ArrowLeft, 
  User, 
  ReceiptText, 
  ChevronDown, 
  Banknote, 
  Calendar, 
  Phone, 
  CreditCard, 
  Building, 
  CheckCircle, 
  XCircle, 
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import SlipDialog from '../components/SlipDialog';
import AddPaymentModal from '../components/AddPaymentModal';
import { useAuth } from '../AuthContext';

export default function TenantProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = id || '';

  const [data, setData] = useState<{ tenant: Tenant; payments: Payment[]; totalPaid: number; slips: any[] } | null | undefined>(undefined);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
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

  if (data === undefined) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-slate-500 font-sans">
        <svg className="animate-spin h-7 w-7 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold uppercase tracking-wider">Syncing Tenant Profile...</span>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center font-sans">
        <div className="bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 p-6 rounded-3xl border border-red-100 dark:border-red-950/30">
          <XCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
          <h2 className="text-lg font-black">Tenant details not found</h2>
          <p className="text-sm mt-1.5 opacity-80">This tenant profile may have been removed or updated.</p>
          <button onClick={() => navigate(-1)} className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl py-2 px-4 text-xs transition-all">
            Go Back
          </button>
        </div>
      </div>
    );
  }

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
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 font-sans antialiased text-slate-850 dark:text-gray-100">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 border border-slate-200/50 dark:border-zinc-750/30 transition-all active:scale-95 text-slate-700 dark:text-zinc-300"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-450 dark:text-neutral-500 py-0.5 px-2 bg-slate-100 dark:bg-zinc-800 rounded">
                Property Portfolio
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider py-0.5 px-2.5 rounded-full ${
                tenant.is_active 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450 border border-emerald-200/40' 
                  : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-450 border border-red-200/40'
              }`}>
                {tenant.is_active ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    <span>Occupied</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span>Moved Out</span>
                  </>
                )}
              </span>
            </div>
            <h1 className="text-2xl mt-1 font-black tracking-tight text-slate-800 dark:text-neutral-100">
              Tenant Hub
            </h1>
          </div>
        </div>

        <button
          onClick={() => setIsAddPaymentOpen(true)}
          className="bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 text-white font-extrabold rounded-xl py-3 px-5 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all text-xs uppercase tracking-wider shrink-0"
        >
          <Banknote className="w-4 h-4 stroke-[2.5]" />
          <span>Record New Payment</span>
        </button>
      </div>

      {/* Main Grid View layout split for beautiful layout rhythm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Main Info Cards Bento (lg:col-span-4) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Tenant Details Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute right-4 top-4">
              <Sparkles className="w-5 h-5 text-indigo-500/20" />
            </div>

            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-zinc-800/60 pb-5 mb-5">
              <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 text-slate-500 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200 dark:border-zinc-700 ring-4 ring-neutral-50 dark:ring-zinc-950/20 shadow-inner">
                {tenant.photo ? (
                  <img src={tenant.photo} alt={tenant.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-slate-400 dark:text-zinc-500" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-neutral-100 leading-tight">
                  {tenant.name}
                </h3>
                <p className="text-xs text-slate-450 dark:text-neutral-500 font-bold mt-1 uppercase tracking-wider font-mono">
                  Tenant Profile
                </p>
              </div>
            </div>

            {/* Clean metadata structured list */}
            <div className="space-y-4 text-xs">
              
              {/* Landlord Managed Link details */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50 dark:border-zinc-850/40">
                <span className="text-slate-450 dark:text-neutral-500 font-bold uppercase tracking-wider">Property Owner</span>
                <span className="font-semibold text-slate-800 dark:text-neutral-200">{landlordRealName}</span>
              </div>

              {/* Space specific unit label details */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50 dark:border-zinc-850/40">
                <span className="text-slate-450 dark:text-neutral-500 font-bold uppercase tracking-wider">Unit Allocations</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 border border-indigo-100 dark:border-indigo-950 rounded font-mono">
                  {tenant.flat_or_shop_name || 'N/A'}
                </span>
              </div>

              {/* Specific unit type */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50 dark:border-zinc-850/40">
                <span className="text-slate-450 dark:text-neutral-500 font-bold uppercase tracking-wider">Allocation Type</span>
                <span className="font-semibold text-slate-800 dark:text-neutral-200">
                  {tenant.property_type || 'N/A'}
                </span>
              </div>

              {/* Phone Contacts details */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50 dark:border-zinc-850/40">
                <span className="text-slate-450 dark:text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> WhatsApp / Mobile
                </span>
                <span className="font-semibold text-slate-850 dark:text-neutral-200 font-mono">
                  {tenant.mobile || 'N/A'}
                </span>
              </div>

              {/* Government ID details */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50 dark:border-zinc-850/40">
                <span className="text-slate-450 dark:text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> National ID (NID)
                </span>
                <span className="font-semibold text-slate-850 dark:text-neutral-200 font-mono">
                  {tenant.nid || 'N/A'}
                </span>
              </div>

              {/* Rent Schedule Day details */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50 dark:border-zinc-850/40">
                <span className="text-slate-450 dark:text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Rent Schedule Due
                </span>
                <span className="font-semibold text-slate-850 dark:text-neutral-200">
                  {tenant.due_date ? `Day ${tenant.due_date} of the Month` : 'N/A'}
                </span>
              </div>

              {/* Initial Onboard date details */}
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-slate-450 dark:text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> Agreement Signed
                </span>
                <span className="font-semibold text-slate-850 dark:text-neutral-200">
                  {tenant.joining_date ? format(new Date(tenant.joining_date), 'dd MMM yyyy') : 'N/A'}
                </span>
              </div>

            </div>
          </div>

          {/* Pricing Financial Setup Card */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Monthly Rental Rate Block */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
              <span className="block text-[9px] uppercase font-black tracking-widest text-slate-400 dark:text-neutral-500 mb-1">
                Monthly Rent Rate
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-neutral-100 font-mono">
                ৳{tenant.monthly_rent ? Number(tenant.monthly_rent).toLocaleString('en-BD') : 'N/A'}
              </span>
            </div>

            {/* Advance Retainer Deposit Block */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
              <span className="block text-[9px] uppercase font-black tracking-widest text-slate-400 dark:text-neutral-500 mb-1">
                Security Deposit
              </span>
              <span className="text-xl font-black text-emerald-650 dark:text-emerald-450 font-mono">
                ৳{tenant.deposit_amount ? Number(tenant.deposit_amount).toLocaleString('en-BD') : '0'}
              </span>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Payments Summary + Grouped Payments Area (lg:col-span-8) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Aggregate Lifetime Payment Breakdown Banner Card */}
          <div className="bg-gradient-to-tr from-indigo-700 to-indigo-650 dark:from-indigo-950/80 dark:to-indigo-900/60 text-white border border-indigo-700/50 dark:border-indigo-850/50 rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-5 pointer-events-none">
              <svg className="w-full h-full" fill="currentColor" viewBox="0 0 100 100">
                <polygon points="0,100 100,0 100,100" />
              </svg>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest opacity-70">
                  Lifetime Total Collected
                </span>
                <h4 className="text-3xl font-black tracking-tight font-sans">
                  ৳{totalPaid.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
              </div>

              {payments.length > 0 && (
                <div className="text-left sm:text-right space-y-1 bg-white/10 dark:bg-zinc-950/20 py-2 px-3.5 rounded-xl border border-white/10 max-w-xs">
                  <span className="block text-[8px] uppercase font-black tracking-widest opacity-60">
                    Latest Payment Date
                  </span>
                  <span className="text-xs font-black tracking-tight">
                    {format(new Date(payments[0].payment_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment History List Header & Card accordions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm uppercase font-black tracking-widest text-slate-450 dark:text-neutral-500 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-indigo-500" /> Historic Payment Ledger
              </h3>
              <span className="text-[10px] font-bold text-slate-400 font-mono">
                {groupedPayments.length} billing {groupedPayments.length === 1 ? 'month' : 'months'}
              </span>
            </div>

            {groupedPayments.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-zinc-950/15 border border-slate-200/50 dark:border-zinc-800/60 rounded-2xl">
                <p className="text-sm font-semibold text-slate-450">No payment transaction records have been submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedPayments.map((group: any) => {
                  const isExpanded = expandedMonths[group.key];
                  
                  return (
                    <div 
                      key={group.key} 
                      className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/85 rounded-xl overflow-hidden transition-all shadow-sm hover:border-slate-350 dark:hover:border-zinc-750"
                    >
                      {/* Month Header row clickable to collapse/expand installments */}
                      <div 
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-colors"
                        onClick={() => toggleMonth(group.key)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${group.isCompleted ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450' : 'bg-slate-50 dark:bg-zinc-850/40 text-slate-400'}`}>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 dark:text-neutral-100 text-sm flex items-center gap-2">
                              {formatMonthYear(group.month, group.year)}
                              {group.isCompleted && (
                                <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-emerald-200/40">
                                  Paid
                                </span>
                              )}
                            </p>
                          </div>
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
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors border border-indigo-100/30"
                              title="Generated Slip View"
                            >
                              <ReceiptText className="w-4 h-4" />
                            </button>
                          )}
                          <span className="text-base font-black text-slate-850 dark:text-neutral-100 font-mono">
                            ৳{Number(group.total).toLocaleString('en-BD', { minimumFractionDigits: 1 })}
                          </span>
                        </div>
                      </div>

                      {/* Expandable nested Installments list */}
                      {isExpanded && group.installments.length > 0 && (
                        <div className="bg-slate-50/50 dark:bg-zinc-950/20 px-4 py-3 border-t border-slate-100 dark:border-zinc-850 space-y-2.5">
                          {group.installments.map((inst: any, idx: number) => (
                            <div 
                              key={inst.id || idx} 
                              className="flex justify-between items-center text-xs text-slate-600 dark:text-zinc-400 pl-3.5 border-l-2 border-indigo-500/40 py-0.5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700 dark:text-neutral-300">
                                  {format(new Date(inst.payment_date), 'dd MMM yyyy')}
                                </span>
                                {inst.is_completed && (
                                  <span className="text-[7.5px] font-black text-emerald-600 uppercase tracking-wider font-mono">
                                    [settled installment]
                                  </span>
                                )}
                              </div>
                              <span className="font-extrabold text-slate-800 dark:text-neutral-200 font-mono">
                                ৳{Number(inst.amount).toLocaleString('en-BD')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Slip Viewer overlay */}
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

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
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 font-sans antialiased text-m3-on-surface">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-m3-surface-variant/40 pb-5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 rounded-xl bg-m3-surface hover:bg-m3-surface-variant/40 text-m3-on-surface border border-m3-surface-variant/60 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-m3-on-surface-variant py-0.5 px-2 bg-m3-surface-variant/35 rounded">
                সম্পদ তালিকা (Properties)
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider py-0.5 px-2.5 rounded-full ${
                tenant.is_active 
                  ? 'bg-m3-success-container/30 text-m3-on-success-container border border-m3-success/20' 
                  : 'bg-m3-error-container/30 text-m3-on-error-container border border-m3-error/20'
              }`}>
                {tenant.is_active ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-m3-success" />
                    <span>চলতি ভাড়াটিয়া (Active)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-m3-error" />
                    <span>ছেড়ে দিয়েছেন (Moved Out)</span>
                  </>
                )}
              </span>
            </div>
            <h1 className="text-xl mt-1 font-bold tracking-tight text-m3-on-surface">
              ভাড়াটিয়া ড্যাশবোর্ড (Tenant Hub)
            </h1>
          </div>
        </div>

        <button
          onClick={() => setIsAddPaymentOpen(true)}
          className="bg-m3-primary text-m3-on-primary hover:opacity-95 text-xs font-bold rounded-xl py-3 px-5 flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all tracking-wide shrink-0"
        >
          <Banknote className="w-4.5 h-4.5 stroke-[2]" />
          <span>ভাড়া জমা করুন (Record Payment)</span>
        </button>
      </div>

      {/* Main Grid View layout split for beautiful layout rhythm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Main Info Cards Bento (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Tenant Details Card */}
          <div className="bg-m3-surface text-m3-on-surface border border-m3-surface-variant/40 rounded-2xl p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-4 border-b border-m3-surface-variant/30 pb-5 mb-5">
              <div className="w-14 h-14 bg-m3-surface-variant/30 text-m3-on-surface-variant/80 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-m3-surface-variant/50 shadow-inner">
                {tenant.photo ? (
                  <img src={tenant.photo} alt={tenant.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-m3-on-surface-variant/60" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-m3-on-surface leading-tight">
                  {tenant.name}
                </h3>
                <p className="text-[11px] text-m3-on-surface-variant font-bold mt-1 uppercase tracking-wider">
                  ভাড়াটিয়ার বিবরণ (Tenant Profile)
                </p>
              </div>
            </div>

            {/* Clean metadata structured list */}
            <div className="space-y-4 text-xs">
              
              {/* Landlord Managed Link details */}
              <div className="flex justify-between items-center py-2.5 border-b border-m3-surface-variant/20">
                <span className="text-m3-on-surface-variant font-bold">ফ্ল্যাটের মালিক (Owner)</span>
                <span className="font-semibold text-m3-on-surface">{landlordRealName}</span>
              </div>

              {/* Space specific unit label details */}
              <div className="flex justify-between items-center py-2.5 border-b border-m3-surface-variant/20">
                <span className="text-m3-on-surface-variant font-bold">ফ্ল্যাট বা দোকান (Unit)</span>
                <span className="font-bold text-m3-on-primary-container bg-m3-primary-container px-2 py-0.5 rounded border border-m3-primary/10 font-mono">
                  {tenant.flat_or_shop_name || 'N/A'}
                </span>
              </div>

              {/* Specific unit type */}
              <div className="flex justify-between items-center py-2.5 border-b border-m3-surface-variant/20">
                <span className="text-m3-on-surface-variant font-bold">ক্যাটাগরি (Unit Type)</span>
                <span className="font-semibold text-m3-on-surface">
                  {tenant.property_type || 'N/A'}
                </span>
              </div>

              {/* Phone Contacts details */}
              <div className="flex justify-between items-center py-2.5 border-b border-m3-surface-variant/20">
                <span className="text-m3-on-surface-variant font-bold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-m3-on-surface-variant/60" /> মোবাইল নম্বর (Mobile)
                </span>
                <span className="font-semibold text-m3-on-surface font-mono">
                  {tenant.mobile || 'N/A'}
                </span>
              </div>

              {/* Government ID details */}
              <div className="flex justify-between items-center py-2.5 border-b border-m3-surface-variant/20">
                <span className="text-m3-on-surface-variant font-bold flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-m3-on-surface-variant/60" /> জাতীয় পরিচয়পত্র (NID)
                </span>
                <span className="font-semibold text-m3-on-surface font-mono">
                  {tenant.nid || 'N/A'}
                </span>
              </div>

              {/* Rent Schedule Day details */}
              <div className="flex justify-between items-center py-2.5 border-b border-m3-surface-variant/20">
                <span className="text-m3-on-surface-variant font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-m3-on-surface-variant/60" /> পরিশোধের নির্দিষ্ট দিন (Due Day)
                </span>
                <span className="font-semibold text-m3-on-surface">
                  {tenant.due_date ? `প্রতি মাসের ${tenant.due_date} তারিখ` : 'N/A'}
                </span>
              </div>

              {/* Initial Onboard date details */}
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-m3-on-surface-variant font-bold flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-m3-on-surface-variant/60" /> চুক্তি স্বাক্ষরের তারিখ (Signed)
                </span>
                <span className="font-semibold text-m3-on-surface">
                  {tenant.joining_date ? format(new Date(tenant.joining_date), 'dd MMM yyyy') : 'N/A'}
                </span>
              </div>

            </div>
          </div>

          {/* Pricing Financial Setup Card */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Monthly Rental Rate Block */}
            <div className="bg-m3-surface text-m3-on-surface border border-m3-surface-variant/40 rounded-2xl p-4 shadow-xs">
              <span className="block text-[10px] font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">
                মাসিক ভাড়া (Rent)
              </span>
              <span className="text-lg font-bold text-m3-on-surface font-mono">
                ৳{tenant.monthly_rent ? Number(tenant.monthly_rent).toLocaleString('en-BD') : 'N/A'}
              </span>
            </div>

            {/* Advance Retainer Deposit Block */}
            <div className="bg-m3-surface text-m3-on-surface border border-m3-surface-variant/40 rounded-2xl p-4 shadow-xs">
              <span className="block text-[10px] font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">
                অগ্রিম জামানত (Deposit)
              </span>
              <span className="text-lg font-bold text-m3-success font-mono">
                ৳{tenant.deposit_amount ? Number(tenant.deposit_amount).toLocaleString('en-BD') : '0'}
              </span>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Payments Summary + Grouped Payments Area (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Aggregate Lifetime Payment Breakdown Banner Card */}
          <div className="bg-m3-primary-container text-m3-on-primary-container border border-m3-primary/10 rounded-2xl p-6 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-m3-on-primary-container opacity-90">
                  মোট সংগৃহীত ভাড়া (Total Collected)
                </span>
                <h4 className="text-2xl font-bold tracking-tight">
                  ৳{totalPaid.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
              </div>

              {payments.length > 0 && (
                <div className="text-left sm:text-right space-y-1 bg-m3-surface-variant/20 py-2 px-3.5 rounded-xl border border-m3-primary/10 max-w-xs">
                  <span className="block text-[8px] uppercase font-bold tracking-widest opacity-80">
                    সর্বশেষ প্রাপ্তির তারিখ (Latest)
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {format(new Date(payments[0].payment_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment History List Header & Card accordions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs uppercase font-bold tracking-wider text-m3-on-surface-variant flex items-center gap-1.5">
                <ClipboardList className="w-4.5 h-4.5 text-m3-primary" /> ভাড়ার লেজার বই (Payment Ledger)
              </h3>
              <span className="text-[10px] font-bold text-m3-on-surface-variant font-mono bg-m3-surface-variant/20 px-2 py-0.5 rounded">
                {groupedPayments.length} billing month(s)
              </span>
            </div>

            {groupedPayments.length === 0 ? (
              <div className="text-center py-10 bg-m3-surface-variant/10 border border-m3-surface-variant/30 rounded-2xl">
                <p className="text-sm font-semibold text-m3-on-surface-variant/80">ভাড়া পরিষদ বা জমার কোনো রেকর্ড নেই।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedPayments.map((group: any) => {
                  const isExpanded = expandedMonths[group.key];
                  
                  return (
                    <div 
                      key={group.key} 
                      className="bg-m3-surface text-m3-on-surface border border-m3-surface-variant/40 rounded-xl overflow-hidden transition-all shadow-xs hover:border-m3-surface-variant/80"
                    >
                      {/* Month Header row clickable to collapse/expand installments */}
                      <div 
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-m3-surface-variant/20 transition-colors"
                        onClick={() => toggleMonth(group.key)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${group.isCompleted ? 'bg-m3-success-container/30 text-m3-on-success-container' : 'bg-m3-surface-variant/30 text-m3-on-surface-variant'}`}>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                          <div>
                            <p className="font-bold text-m3-on-surface text-sm flex items-center gap-2">
                              {formatMonthYear(group.month, group.year)}
                              {group.isCompleted && (
                                <span className="bg-m3-success-container/30 text-m3-on-success-container text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-m3-success/20">
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
                              className="p-2 bg-m3-primary-container hover:bg-m3-primary-container/85 text-m3-on-primary-container rounded-lg transition-colors border border-m3-primary/10"
                              title="Generated Slip View"
                            >
                              <ReceiptText className="w-4 h-4" />
                            </button>
                          )}
                          <span className="text-sm font-bold text-m3-on-surface font-mono">
                            ৳{Number(group.total).toLocaleString('en-BD', { minimumFractionDigits: 1 })}
                          </span>
                        </div>
                      </div>

                      {/* Expandable nested Installments list */}
                      {isExpanded && group.installments.length > 0 && (
                        <div className="bg-m3-surface-variant/10 px-4 py-3 border-t border-m3-surface-variant/30 space-y-2.5">
                          {group.installments.map((inst: any, idx: number) => (
                            <div 
                              key={inst.id || idx} 
                              className="flex justify-between items-center text-xs text-m3-on-surface-variant pl-3.5 border-l-2 border-m3-primary/40 py-0.5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-m3-on-surface">
                                  {format(new Date(inst.payment_date), 'dd MMM yyyy')}
                                </span>
                                {inst.is_completed && (
                                  <span className="text-[7.5px] font-bold text-m3-success uppercase tracking-wider font-mono">
                                    [settled]
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-m3-on-surface font-mono">
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

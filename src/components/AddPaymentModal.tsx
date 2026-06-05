import { useState, useEffect, FormEvent } from 'react';
import { type Tenant, type Payment, supabase } from '../supabase';
import { getTenants, getPayments, addPayment, addSlip } from '../dataService';
import { format } from 'date-fns';
import { X, Banknote } from 'lucide-react';
import SlipDialog from './SlipDialog';
import { useAuth } from '../AuthContext';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedTenantId?: string;
}

export default function AddPaymentModal({ isOpen, onClose, onSuccess, preselectedTenantId }: AddPaymentModalProps) {
  const { user, isGuest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(preselectedTenantId || '');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMonth, setPaymentMonth] = useState(format(new Date(), 'MMM')); // format as "Jan", "Feb", etc.
  const [paymentYear, setPaymentYear] = useState(format(new Date(), 'yyyy'));

  // Info of the selected tenant
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [dueAmount, setDueAmount] = useState<number>(0);
  const [paidThisMonth, setPaidThisMonth] = useState<number>(0);

  // Confirmations & Slip Displays
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [paymentFullyPaid, setPaymentFullyPaid] = useState(false);
  const [showSlipDialog, setShowSlipDialog] = useState(false);
  const [slipData, setSlipData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [unpaidPrevMonth, setUnpaidPrevMonth] = useState<{ month: string; year: string; due: number } | null>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  useEffect(() => {
    async function loadData() {
      const tenants = await getTenants();
      if (tenants) {
        setAllTenants(tenants.filter(t => t.is_active));
      }
      setLoading(false);
    }
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedTenantId) {
      setSelectedTenantId(preselectedTenantId);
    }
  }, [preselectedTenantId]);

  // Track the due/paid details of the selected tenant for the chosen month
  useEffect(() => {
    async function updateTenantDetails() {
      const tId = selectedTenantId;
      if (!tId) {
        setSelectedTenant(null);
        setDueAmount(0);
        setPaidThisMonth(0);
        setUnpaidPrevMonth(null);
        return;
      }

      const tenant = allTenants.find(t => t.id === tId) || null;
      setSelectedTenant(tenant);

      if (tenant) {
        const allPayments = await getPayments();
        const existingPayments = allPayments.filter(p => p.tenant_id === tId);

        // Check for unpaid previous months
        if (tenant.joining_date) {
          const joinDate = new Date(tenant.joining_date);
          const joinYear = joinDate.getFullYear();
          const joinMonth = joinDate.getMonth(); // 0-11

          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const targetMonthIdx = monthNames.indexOf(paymentMonth);
          const targetYearNum = Number(paymentYear);

          if (targetMonthIdx !== -1 && !isNaN(targetYearNum)) {
            let currentYear = joinYear;
            let currentMonthIdx = joinMonth;
            let foundUnpaid: { month: string; year: string; due: number } | null = null;

            while (
              currentYear < targetYearNum || 
              (currentYear === targetYearNum && currentMonthIdx < targetMonthIdx)
            ) {
              const checkMonthStr = monthNames[currentMonthIdx];
              const checkYearStr = currentYear.toString();

              const paymentsForCheckMonth = existingPayments.filter(
                p => p.month === checkMonthStr && p.year === checkYearStr
              );
              const totalPaidForCheckMonth = paymentsForCheckMonth.reduce((sum, p) => sum + p.amount, 0);
              const dueForCheckMonth = tenant.monthly_rent - totalPaidForCheckMonth;

              if (dueForCheckMonth > 0.1) {
                foundUnpaid = {
                  month: checkMonthStr,
                  year: checkYearStr,
                  due: dueForCheckMonth
                };
                break;
              }

              // increment month
              currentMonthIdx++;
              if (currentMonthIdx > 11) {
                currentMonthIdx = 0;
                currentYear++;
              }
            }
            setUnpaidPrevMonth(foundUnpaid);
          } else {
            setUnpaidPrevMonth(null);
          }
        } else {
          setUnpaidPrevMonth(null);
        }

        const paymentsThisMonth = existingPayments.filter(p => p.month === paymentMonth && p.year === paymentYear);
        const totalPaid = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);
        
        setPaidThisMonth(totalPaid);
        const due = tenant.monthly_rent - totalPaid;
        setDueAmount(due > 0 ? due : 0);

        // Pre-fill amount with remaining due amount if empty or not set
        if (!paymentAmount) {
          setPaymentAmount(due > 0 ? due.toString() : '');
        }
      }
    }

    if (isOpen && !loading) {
      updateTenantDetails();
    }
  }, [selectedTenantId, paymentMonth, paymentYear, allTenants, isOpen, loading]);

  if (!isOpen) return null;

  const handleAddPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !paymentAmount || !paymentMonth || !paymentYear) return;

    if (unpaidPrevMonth) {
      showError(`আগের বকেয়া পরিশোধ করুন: ${unpaidPrevMonth.month} ${unpaidPrevMonth.year} মাসের বকেয়া ৳${unpaidPrevMonth.due} এখনও পরিশোধ করা হয়নি।`);
      return;
    }

    const amountToPay = Number(paymentAmount);
    if (amountToPay <= 0) {
      showError('Please enter a valid amount.');
      return;
    }

    if (!selectedTenant) return;

    if (selectedTenant.joining_date) {
      const joinDateObj = new Date(selectedTenant.joining_date);
      const joinMonth = joinDateObj.getMonth();
      const joinYearNum = joinDateObj.getFullYear();
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const paymentMonthNum = monthNames.indexOf(paymentMonth);
      const enteredYearNum = Number(paymentYear);

      if (enteredYearNum < joinYearNum || (enteredYearNum === joinYearNum && paymentMonthNum < joinMonth)) {
        showError(`You cannot take rent for a month prior to the tenant's joining date (${format(joinDateObj, 'MMMM yyyy')}).`);
        return;
      }
    }

    if (amountToPay > dueAmount) {
      if (dueAmount <= 0) {
        showError(`Rent for this month is already fully paid.`);
      } else {
        showError(`Cannot exceed monthly rent. Due amount is ৳${dueAmount.toFixed(2)}.`);
      }
      return;
    }

    const isNowCompleted = (paidThisMonth + amountToPay) >= selectedTenant.monthly_rent;
    setPaymentFullyPaid(isNowCompleted);
    setConfirmPayment(true);
  };

  const executeAddPayment = async (generateSlip: boolean = false) => {
    setConfirmPayment(false);

    const amountToPay = Number(paymentAmount);
    if (!selectedTenant) return;

    const paymentTimestamp = Date.now();
    const isNowCompleted = (paidThisMonth + amountToPay) >= selectedTenant.monthly_rent;

    const { error } = await addPayment({
      tenant_id: selectedTenantId,
      month: paymentMonth,
      year: paymentYear,
      amount: amountToPay,
      payment_date: paymentTimestamp,
      is_completed: isNowCompleted
    });

    if (error) {
      showError('Failed to record payment: ' + error.message);
      return;
    }

    let slipToDisplay = null;
    let slipGenerated = false;

    // Fast check to see if there was already completed payment
    const allPayments = await getPayments();
    const existingPayments = allPayments.filter(p => p.tenant_id === selectedTenantId);
    const paymentsThisMonth = existingPayments.filter(p => p.month === paymentMonth && p.year === paymentYear && p.is_completed);
    const wasAlreadyCompleted = paymentsThisMonth.length > 1; // if count > 1 including this newly saved one

    if (isNowCompleted && !wasAlreadyCompleted) {
      const gSlipNumber = `RF-${Math.floor(10000 + Math.random() * 90000)}`;
      const newSlipObj = {
        tenant_id: selectedTenantId,
        slip_number: gSlipNumber,
        payment_month: paymentMonth,
        payment_year: paymentYear,
        total_amount: selectedTenant.monthly_rent,
        generated_at: new Date(paymentTimestamp).toISOString()
      };
      await addSlip(newSlipObj);
      slipGenerated = true;

      let landlordRealName = user?.name || 'Owner';
      if (user?.id) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();
          if (userData && userData.name) {
            landlordRealName = userData.name;
          }
        } catch (err) {
          console.warn("Failed to fetch landlord name, fallback used:", err);
        }
      }

      slipToDisplay = {
        landlordName: landlordRealName,
        tenantName: selectedTenant.name,
        flatName: selectedTenant.flat_or_shop_name,
        monthlyRent: selectedTenant.monthly_rent,
        amountPaid: paidThisMonth + amountToPay,
        billingMonth: paymentMonth,
        billingYear: paymentYear,
        datePaid: new Date(paymentTimestamp).toLocaleDateString(),
        slipNumber: gSlipNumber,
        propertyType: selectedTenant.property_type,
        paymentStatus: 'CLEARED'
      };
    }

    setPaymentAmount('');

    if (generateSlip && slipToDisplay) {
      setSlipData(slipToDisplay);
      setShowSlipDialog(true);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-m3-surface rounded-3xl w-full max-w-md max-h-full md:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-m3-surface-variant">
          <div className="sticky top-0 bg-m3-surface-variant border-b border-m3-surface-variant p-5 flex justify-between items-center z-10">
            <div className="flex items-center gap-2 text-m3-on-surface-variant">
              <Banknote className="w-5 h-5 text-m3-primary" />
              <h2 className="text-xl font-bold">Record Payment</h2>
            </div>
            <button onClick={onClose} className="p-2 text-m3-on-surface-variant hover:bg-black/5 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {errorMsg && (
              <div className="mb-4 bg-m3-error-container text-m3-on-error-container p-3.5 rounded-xl text-xs font-bold animate-pulse">
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div className="text-center py-6 text-m3-on-surface-variant">Loading tenants...</div>
            ) : (
              <form onSubmit={handleAddPayment} className="space-y-4">
                {/* Select Tenant field */}
                {preselectedTenantId ? (
                  <div className="bg-m3-surface-variant/30 rounded-2xl p-4 border border-m3-surface-variant">
                    <p className="text-xs font-medium text-m3-on-surface-variant uppercase tracking-wider">Tenant Name</p>
                    <p className="text-lg font-bold text-m3-on-surface">{selectedTenant?.name}</p>
                    <p className="text-xs text-m3-on-surface-variant mt-1 font-medium">
                      {selectedTenant?.property_type === 'Both' ? 'Flat & Shop Name' : (selectedTenant?.property_type || 'Flat/Shop')}: {selectedTenant?.flat_or_shop_name}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Select Tenant *</label>
                    <select 
                      required 
                      value={selectedTenantId} 
                      onChange={e => { setSelectedTenantId(e.target.value); setPaymentAmount(''); }} 
                      className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none"
                    >
                      <option value="">-- Select Tenant --</option>
                      {allTenants.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.property_type === 'Both' ? 'Flat & Shop' : (t.property_type || 'Flat/Shop')}: {t.flat_or_shop_name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Fields */}
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Rent Month & Year *</label>
                  <div className="flex gap-3">
                    <select 
                      value={paymentMonth} 
                      onChange={e => { setPaymentMonth(e.target.value); setPaymentAmount(''); }} 
                      className="w-2/3 bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none"
                    >
                      <option value="Jan">January</option>
                      <option value="Feb">February</option>
                      <option value="Mar">March</option>
                      <option value="Apr">April</option>
                      <option value="May">May</option>
                      <option value="Jun">June</option>
                      <option value="Jul">July</option>
                      <option value="Aug">August</option>
                      <option value="Sep">September</option>
                      <option value="Oct">October</option>
                      <option value="Nov">November</option>
                      <option value="Dec">December</option>
                    </select>
                    <input 
                      required 
                      type="number" 
                      value={paymentYear} 
                      onChange={e => { setPaymentYear(e.target.value); setPaymentAmount(''); }} 
                      className="w-1/3 bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none text-center" 
                      placeholder="Year" 
                    />
                  </div>
                </div>

                {/* Calculated billing details info box */}
                {selectedTenant && (
                  <div className="bg-m3-primary-container text-m3-on-primary-container rounded-2xl p-4 text-xs font-medium space-y-1">
                    <div className="flex justify-between">
                      <span>Monthly Rent:</span>
                      <span className="font-bold">৳{selectedTenant.monthly_rent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Already Paid ({paymentMonth} {paymentYear}):</span>
                      <span className="font-bold text-m3-success">৳{paidThisMonth}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-m3-on-primary-container/10">
                      <span>Outstanding Due Amount:</span>
                      <span className="font-bold text-m3-error text-base">৳{dueAmount}</span>
                    </div>
                  </div>
                )}

                {unpaidPrevMonth && (
                  <div className="bg-m3-error-container text-m3-on-error-container rounded-2xl p-4 text-xs font-bold space-y-2 border border-m3-error/20">
                    <p className="text-sm flex items-center gap-1">⚠️ বকেয়া ব্লোকড!</p>
                    <p className="leading-relaxed">
                      এই ভাড়াটিয়ার পূর্ববর্তী <strong>{unpaidPrevMonth.month} {unpaidPrevMonth.year}</strong> মাসের <strong>৳{unpaidPrevMonth.due}</strong> বকেয়া ভাড়া পরিশোধ করা হয়নি। আগে সেটি পরিশোধ করুন।
                    </p>
                  </div>
                )}

                {/* Amount Paid */}
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Amount Paid *</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    placeholder={unpaidPrevMonth ? "আগের বকেয়া পরিশোধ করুন" : "Enter collected amount"}
                    value={paymentAmount} 
                    onChange={e => setPaymentAmount(e.target.value)} 
                    disabled={!!unpaidPrevMonth}
                    className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none disabled:opacity-40 disabled:cursor-not-allowed" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={!selectedTenantId || dueAmount <= 0 || !!unpaidPrevMonth}
                  className="w-full bg-m3-success text-m3-on-success disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-full p-4 mt-4 hover:bg-opacity-90 transition-colors cursor-pointer text-center uppercase tracking-wider text-sm shadow-md"
                >
                  {unpaidPrevMonth ? 'আগের বকেয়া পরিশোধ করুন' : (dueAmount <= 0 ? 'Fully Paid' : 'Mark as Paid')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmPayment && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <div className="bg-m3-surface rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 border border-m3-surface-variant">
            <h3 className="text-xl font-bold text-m3-on-surface mb-2">Confirm Payment</h3>
            <div className="text-sm text-m3-on-surface-variant space-y-2 mb-8">
              <p>Tenant: <strong>{selectedTenant.name}</strong></p>
              <p>Amount: <strong className="text-lg text-m3-primary">৳{paymentAmount}</strong></p>
              <p>Month: <strong>{paymentMonth} {paymentYear}</strong></p>
              {paymentFullyPaid && <p className="text-m3-success font-bold mt-2">🎉 This month's rent will be fully paid.</p>}
            </div>
            
            {paymentFullyPaid ? (
              <div className="flex justify-between items-center gap-2 mt-2">
                <button 
                  onClick={() => executeAddPayment(true)} 
                  className="w-1/2 flex items-center justify-center py-3 rounded-full bg-m3-primary-container text-m3-on-primary-container font-black text-xs uppercase tracking-wider hover:bg-opacity-90 transition-colors shadow-sm"
                >
                  Collect Slip
                </button>
                <div className="flex w-1/2 gap-2 justify-end">
                  <button 
                    onClick={() => setConfirmPayment(false)} 
                    className="px-3 py-2.5 rounded-full border border-m3-primary text-m3-primary font-bold text-xs hover:bg-m3-primary/10 transition-colors"
                  >
                    Re-edit
                  </button>
                  <button 
                    onClick={() => executeAddPayment(false)} 
                    className="px-4 py-2.5 rounded-full bg-m3-primary text-m3-on-primary font-bold text-xs hover:bg-opacity-90 transition-colors shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 justify-end mt-2">
                <button 
                  onClick={() => setConfirmPayment(false)} 
                  className="px-5 py-2.5 rounded-full border border-m3-primary text-m3-primary font-bold hover:bg-m3-primary/10 transition-colors text-sm"
                >
                  Re-edit
                </button>
                <button 
                  onClick={() => executeAddPayment(false)} 
                  className="px-5 py-2.5 rounded-full bg-m3-primary text-m3-on-primary font-bold hover:bg-opacity-90 transition-colors shadow-sm text-sm"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Slip dialog */}
      {showSlipDialog && (
        <SlipDialog 
          slipData={slipData} 
          isOpen={showSlipDialog} 
          onClose={() => {
            setShowSlipDialog(false);
            onSuccess();
            onClose();
          }} 
        />
      )}
    </>
  );
}

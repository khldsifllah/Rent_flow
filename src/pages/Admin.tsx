import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { supabase, type Tenant, type Payment } from '../supabase';
import { getTenants, getPayments, addTenant, updateTenant, deleteTenant, deletePaymentsByTenantId, addPayment, addSlip } from '../dataService';
import { format } from 'date-fns';
import { Plus, X, User, LogOut, Mail, Star, Info, Palette, Banknote, UserCog } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import ProfileModal from '../components/ProfileModal';
import SlipDialog from '../components/SlipDialog';
import ThemeModal from '../components/ThemeModal';
import GuestLimitModal from '../components/GuestLimitModal';
import LogoutConfirmModal from '../components/LogoutConfirmModal';
import { compressImage } from '../utils/imageUtils';

export default function Admin() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, signOut } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  // Add Tenant State
  const [photo, setPhoto] = useState<string>('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [nid, setNid] = useState('');
  const [propertyType, setPropertyType] = useState<'Flat' | 'Shop' | 'Both'>('Flat');
  const [flat, setFlat] = useState('');
  const [rent, setRent] = useState('');
  const [advance, setAdvance] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [joinDate, setJoinDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTenants() {
    const data = await getTenants();
    if (data) setAllTenants(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchTenants();
  }, []);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setPhoto(compressedBase64);
      } catch (err) {
        console.error("Error compressing image", err);
      }
    }
  };

  // Payment State
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMonth, setPaymentMonth] = useState(format(new Date(), 'MM'));
  const [paymentYear, setPaymentYear] = useState(format(new Date(), 'yyyy'));

  // Edit/Delete Tenant State
  const [editTenantId, setEditTenantId] = useState<string>('');
  const [editPhoto, setEditPhoto] = useState<string>('');
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editNid, setEditNid] = useState('');
  const [editPropertyType, setEditPropertyType] = useState<'Flat' | 'Shop' | 'Both'>('Flat');
  const [editFlat, setEditFlat] = useState('');
  const [editRent, setEditRent] = useState('');
  const [editAdvance, setEditAdvance] = useState('');
  const [editDueDay, setEditDueDay] = useState('');
  const [editJoinDate, setEditJoinDate] = useState('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [showGuestLimitDialog, setShowGuestLimitDialog] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Confirmation Request States
  const [confirmAddTenant, setConfirmAddTenant] = useState(false);
  const [confirmUpdateTenant, setConfirmUpdateTenant] = useState(false);
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [paymentFullyPaid, setPaymentFullyPaid] = useState(false);
  const [showSlipDialog, setShowSlipDialog] = useState(false);
  const [slipData, setSlipData] = useState<any>(null);

  useEffect(() => {
    if (location.state?.openAddTenant && !loading) {
      const activeCount = allTenants.filter(t => t.is_active).length;
      if (isGuest && activeCount >= 5) {
        setShowGuestLimitDialog(true);
      } else {
        setIsAddTenantModalOpen(true);
      }
      navigate('/admin', { replace: true, state: {} });
    } else if (location.state?.focusPayment) {
      const el = document.getElementById('add-payment-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        // Optional: add a brief highlight effect
        el.classList.add('ring-2', 'ring-m3-primary', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-m3-primary', 'ring-offset-2'), 2000);
      }
      navigate('/admin', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const handleAddTenant = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !rent || !dueDay) return;

    if (isGuest && activeTenants.length >= 5) {
      setShowGuestLimitDialog(true);
      setIsAddTenantModalOpen(false);
      return;
    }
    setConfirmAddTenant(true);
  };

  const executeAddTenant = async () => {
    setConfirmAddTenant(false);
    
    const { error } = await addTenant({
      photo: photo,
      name,
      mobile: mobile,
      nid: nid,
      property_type: propertyType,
      flat_or_shop_name: flat,
      monthly_rent: Number(rent),
      due_date: Number(dueDay),
      deposit_amount: Number(advance) || 0,
      joining_date: joinDate,
      is_active: true,
      deposit_returned: false
    });

    if (error) {
      showError('Failed to save tenant: ' + error.message);
      return;
    }

    setPhoto(''); setName(''); setMobile(''); setNid(''); setPropertyType('Flat'); setFlat(''); setRent(''); setAdvance(''); setDueDay(''); setJoinDate(format(new Date(), 'yyyy-MM-dd'));
    setIsAddTenantModalOpen(false);
    showSuccess('Successfully Saved!');
    fetchTenants();
  };

  const handleAddPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !paymentAmount || !paymentMonth || !paymentYear) return;

    const tenantIdStr = selectedTenantId;
    const amountToPay = Number(paymentAmount);

    const tenant = allTenants.find(t => t.id === tenantIdStr);
    if (!tenant) return;

    if (tenant.joining_date) {
      const joinDateObj = new Date(tenant.joining_date);
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

    const allPayments = await getPayments();
    const existingPayments = allPayments.filter(p => p.tenant_id === tenantIdStr);
      
    const paymentsThisMonth = (existingPayments || []).filter((p: Payment) => p.month === paymentMonth && p.year === paymentYear);
    const totalPaidThisMonth = paymentsThisMonth.reduce((sum: number, p: Payment) => sum + p.amount, 0);
    const dueAmount = tenant.monthly_rent - totalPaidThisMonth;

    if (amountToPay > dueAmount) {
      if (dueAmount <= 0) {
        showError(`Rent for this month is already fully paid.`);
      } else {
        showError(`Cannot exceed monthly rent. Due amount is ৳${dueAmount.toFixed(2)}.`);
      }
      return;
    }

    const isNowCompleted = (totalPaidThisMonth + amountToPay) >= tenant.monthly_rent;
    setPaymentFullyPaid(isNowCompleted);
    setConfirmPayment(true);
  };

  const executeAddPayment = async (generateSlip: boolean = false) => {
    setConfirmPayment(false);

    const tenantIdStr = selectedTenantId;
    const amountToPay = Number(paymentAmount);
    const tenant = allTenants.find(t => t.id === tenantIdStr);
    if (!tenant) return;

    // Fast fail check again
    const allPayments = await getPayments();
    const existingPayments = allPayments.filter(p => p.tenant_id === tenantIdStr);
    const paymentsThisMonth = (existingPayments || []).filter((p: Payment) => p.month === paymentMonth && p.year === paymentYear);
    const totalPaidThisMonth = paymentsThisMonth.reduce((sum: number, p: Payment) => sum + p.amount, 0);
    const isNowCompleted = (totalPaidThisMonth + amountToPay) >= tenant.monthly_rent;
    const paymentTimestamp = Date.now();

    const { error } = await addPayment({
      tenant_id: tenantIdStr,
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

    const wasAlreadyCompleted = paymentsThisMonth.some((p: Payment) => p.is_completed);

    let slipToDisplay = null;
    let slipGenerated = false;

    if (isNowCompleted && !wasAlreadyCompleted) {
      const gSlipNumber = `RF-${Math.floor(10000 + Math.random() * 90000)}`;
      const newSlipObj = {
        tenant_id: tenantIdStr,
        slip_number: gSlipNumber,
        payment_month: paymentMonth,
        payment_year: paymentYear,
        total_amount: tenant.monthly_rent, // full month rent
        generated_at: new Date(paymentTimestamp).toISOString()
      };
      await addSlip(newSlipObj);
      slipGenerated = true;

      let landlordRealName = user?.name || 'Owner';
      if (!user?.name && user?.id) {
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
          console.warn("Failed to fetch landlord name from users table, fallback used:", err);
        }
      }

      slipToDisplay = {
        landlordName: landlordRealName,
        tenantName: tenant.name,
        flatName: tenant.flat_or_shop_name,
        monthlyRent: tenant.monthly_rent,
        amountPaid: totalPaidThisMonth + amountToPay,
        billingMonth: paymentMonth,
        billingYear: paymentYear,
        datePaid: new Date(paymentTimestamp).toLocaleDateString(),
        slipNumber: gSlipNumber,
        propertyType: tenant.property_type,
        paymentStatus: 'CLEARED'
      };
    }

    setPaymentAmount('');

    if (generateSlip && slipToDisplay) {
      setSlipData(slipToDisplay);
      setShowSlipDialog(true);
    } else if (slipGenerated) {
      showSuccess('Payment saved. Slip generated successfully.');
    } else {
      showSuccess('Payment recorded successfully!');
    }
  };

  const handleEditPhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setEditPhoto(compressedBase64);
      } catch (err) {
        console.error("Error compressing image", err);
      }
    }
  };

  const handleSelectEditTenant = (id: string) => {
    setEditTenantId(id);
    setShowDeleteConfirm(false);
    if (!id) {
      setEditPhoto(''); setEditName(''); setEditMobile(''); setEditNid(''); setEditPropertyType('Flat'); setEditFlat(''); setEditRent(''); setEditDueDay(''); setEditIsActive(true);
      return;
    }
    const t = allTenants?.find(t => t.id === id);
    if (t) {
      setEditPhoto(t.photo || '');
      setEditName(t.name);
      setEditMobile(t.mobile);
      setEditNid(t.nid);
      setEditPropertyType(t.property_type || 'Flat');
      setEditFlat(t.flat_or_shop_name);
      setEditRent(t.monthly_rent.toString());
      setEditAdvance(t.deposit_amount?.toString() || '0');
      setEditDueDay(t.due_date.toString());
      setEditJoinDate(t.joining_date || '');
      setEditIsActive(t.is_active);
    }
  };

  const handleUpdateTenant = (e: FormEvent) => {
    e.preventDefault();
    if (!editTenantId || !editName || !editRent || !editDueDay) return;
    setConfirmUpdateTenant(true);
  };

  const executeUpdateTenant = async () => {
    setConfirmUpdateTenant(false);
    const { error } = await updateTenant(editTenantId, {
      photo: editPhoto,
      name: editName,
      mobile: editMobile,
      nid: editNid,
      property_type: editPropertyType,
      flat_or_shop_name: editFlat,
      monthly_rent: Number(editRent),
      due_date: Number(editDueDay),
      deposit_amount: Number(editAdvance) || 0,
      joining_date: editJoinDate,
      is_active: editIsActive
    });

    if (error) {
      showError('Failed to update tenant: ' + error.message);
      return;
    }

    showSuccess('Successfully Updated!');
    fetchTenants();
  };

  const confirmDeleteTenant = async () => {
    const id = editTenantId;
    const { error: pError } = await deletePaymentsByTenantId(id);
    const { error: tError } = await deleteTenant(id);
    
    if (pError || tError) {
      showError('Failed to delete tenant');
      return;
    }

    showSuccess('Tenant deleted successfully!');
    setEditTenantId('');
    setShowDeleteConfirm(false);
    fetchTenants();
  };

  if (loading) return <div className="p-4">Loading...</div>;

  const activeTenants = allTenants.filter(t => t.is_active);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2 gap-2">
        <h1 className="text-xl sm:text-3xl font-bold text-m3-on-surface whitespace-nowrap shrink-0">Admin Panel</h1>
        <div className="flex items-center gap-3 shrink-0">
          {(!isGuest && user?.name) ? (
            <span className="text-sm sm:text-lg font-bold text-m3-on-surface truncate max-w-[100px] sm:max-w-xs">
              {user.name}
            </span>
          ) : isGuest ? (
            <div className="flex flex-col items-end text-right shrink-0">
              <span className="text-xs sm:text-sm font-bold text-m3-on-surface truncate max-w-[120px] sm:max-w-xs leading-none">
                Guest Mode
              </span>
              <span className="text-[9px] sm:text-xs text-m3-on-surface-variant font-medium mt-1 whitespace-nowrap">Login free to get more potential</span>
            </div>
          ) : null}
          <div className="relative">
            <button 
              onClick={() => {
                if (isGuest) {
                  window.location.href = '/login';
                } else {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                }
              }}
              className="w-10 h-10 rounded-full bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center overflow-hidden border-2 border-m3-primary/10 hover:border-m3-primary transition-all"
            >
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </button>
            
            {isProfileMenuOpen && !isGuest && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsProfileMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-64 bg-m3-surface border border-m3-surface-variant rounded-2xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="px-4 py-3 border-b border-m3-surface-variant mb-1">
                    <p className="text-sm font-bold text-m3-on-surface truncate">{user?.name}</p>
                    <p className="text-xs text-m3-on-surface-variant truncate">{user?.email}</p>
                  </div>
                  
                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); setIsProfileModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-m3-on-surface hover:bg-m3-surface-variant transition-colors text-left"
                  >
                    <User className="w-4 h-4" />
                    <span>Customize Profile</span>
                  </button>

                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); setIsThemeModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-m3-on-surface hover:bg-m3-surface-variant transition-colors text-left"
                  >
                    <Palette className="w-4 h-4" />
                    <span>Theme</span>
                  </button>

                  <a 
                    href="mailto:khldsifllah@gmail.com"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-m3-on-surface hover:bg-m3-surface-variant transition-colors text-left"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Feedback</span>
                  </a>

                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); alert('Thanks for wanting to rate us! App Store links coming soon.'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-m3-on-surface hover:bg-m3-surface-variant transition-colors text-left"
                  >
                    <Star className="w-4 h-4" />
                    <span>Rate Us</span>
                  </button>

                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); setShowAbout(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-m3-on-surface hover:bg-m3-surface-variant transition-colors text-left"
                  >
                    <Info className="w-4 h-4" />
                    <span>About</span>
                  </button>

                  <div className="border-t border-m3-surface-variant my-1"></div>

                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); setIsLogoutModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-m3-error hover:bg-m3-error-container transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-m3-success-container text-m3-on-success-container px-6 py-3 rounded-full shadow-lg z-50 text-sm font-bold transition-all duration-300">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-m3-error-container text-m3-on-error-container px-6 py-3 rounded-full shadow-lg z-50 text-sm font-bold transition-all duration-300">
          {errorMsg}
        </div>
      )}

      {/* Theme Modal */}
      <ThemeModal 
        isOpen={isThemeModalOpen} 
        onClose={() => setIsThemeModalOpen(false)} 
      />

      {/* Add New Tenant Modal */}
      {isAddTenantModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-m3-surface rounded-3xl w-full max-w-md max-h-full md:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-m3-surface-variant border-b border-m3-surface-variant p-5 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-m3-on-surface-variant">Add New Tenant</h2>
              <button onClick={() => setIsAddTenantModalOpen(false)} className="p-2 text-m3-on-surface-variant hover:bg-black/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddTenant} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Name *</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Profile Photo</label>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                  {photo && <img src={photo} alt="Preview" className="mt-3 w-20 h-20 object-cover rounded-2xl" />}
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Mobile</label>
                  <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">NID</label>
                  <input type="text" value={nid} onChange={e => setNid(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Property Type</label>
                  <select value={propertyType} onChange={e => setPropertyType(e.target.value as 'Flat' | 'Shop' | 'Both')} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none">
                    <option value="Flat">Flat</option>
                    <option value="Shop">Shop</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Property Name/No.</label>
                  <input type="text" value={flat} onChange={e => setFlat(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Monthly Rent *</label>
                  <input required type="number" step="0.01" value={rent} onChange={e => setRent(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Advance Amount (Deposit)</label>
                  <input type="number" step="0.01" value={advance} onChange={e => setAdvance(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Due Date (Day of Month) *</label>
                  <input required type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Join Date (Rent Start Date)</label>
                  <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <button type="submit" className="w-full bg-m3-primary text-m3-on-primary font-bold rounded-full p-4 mt-6 hover:bg-opacity-90 transition-colors">
                  Save Tenant
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record Payment */}
        <section id="add-payment-section" className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-m3-success-container text-m3-on-success-container rounded-2xl">
              <Banknote className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-m3-on-surface">Add new Payment</h2>
          </div>
          <form onSubmit={handleAddPayment} className="space-y-4 flex-1 flex flex-col">
            <div>
              <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Select Tenant *</label>
              <select required value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none">
                <option value="">-- Select Tenant --</option>
                {activeTenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.property_type === 'Both' ? 'Flat & Shop' : (t.property_type || 'Flat/Shop')}: {t.flat_or_shop_name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Rent Month & Year *</label>
              <div className="flex gap-3">
                <select value={paymentMonth} onChange={e => setPaymentMonth(e.target.value)} className="w-2/3 bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none">
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
                <input required type="number" value={paymentYear} onChange={e => setPaymentYear(e.target.value)} className="w-1/3 bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" placeholder="Year" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Amount Paid *</label>
              <input required type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
            </div>
            <div className="mt-auto pt-6">
              <button type="submit" className="w-full bg-m3-success text-m3-on-success font-bold rounded-full p-4 hover:bg-opacity-90 transition-colors">
                Mark as Paid
              </button>
            </div>
          </form>
        </section>

        {/* Manage Tenant (Edit / Delete) */}
        <section className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-m3-primary-container text-m3-on-primary-container rounded-2xl">
              <UserCog className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-m3-on-surface">Manage Tenant</h2>
          </div>
          <div className="space-y-4 flex-1 flex flex-col">
            <div>
              <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Select Tenant to Edit/Delete *</label>
              <select value={editTenantId} onChange={e => handleSelectEditTenant(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none">
                <option value="">-- Select Tenant --</option>
                {allTenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.is_active ? 'Active' : 'Moved Out'})</option>
                ))}
              </select>
            </div>

            {editTenantId && (
              <form onSubmit={handleUpdateTenant} className="space-y-4 pt-6 mt-2 border-t border-m3-surface-variant flex-1 flex flex-col">
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Name *</label>
                  <input required type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Profile Photo</label>
                  <input type="file" accept="image/*" onChange={handleEditPhotoChange} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                  {editPhoto && <img src={editPhoto} alt="Preview" className="mt-3 w-20 h-20 object-cover rounded-2xl" />}
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Mobile</label>
                  <input type="tel" value={editMobile} onChange={e => setEditMobile(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">NID</label>
                  <input type="text" value={editNid} onChange={e => setEditNid(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Property Type</label>
                  <select value={editPropertyType} onChange={e => setEditPropertyType(e.target.value as 'Flat' | 'Shop' | 'Both')} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none">
                    <option value="Flat">Flat</option>
                    <option value="Shop">Shop</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Property Name/No.</label>
                  <input type="text" value={editFlat} onChange={e => setEditFlat(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Monthly Rent *</label>
                  <input required type="number" step="0.01" value={editRent} onChange={e => setEditRent(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Advance Amount (Deposit)</label>
                  <input type="number" step="0.01" value={editAdvance} onChange={e => setEditAdvance(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Due Date (Day of Month) *</label>
                  <input required type="number" min="1" max="31" value={editDueDay} onChange={e => setEditDueDay(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Join Date (Rent Start Date)</label>
                  <input type="date" value={editJoinDate} onChange={e => setEditJoinDate(e.target.value)} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Status</label>
                  <select value={editIsActive ? 'true' : 'false'} onChange={e => setEditIsActive(e.target.value === 'true')} className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none">
                    <option value="true">Active</option>
                    <option value="false">Moved Out</option>
                  </select>
                </div>
                
                <div className="mt-auto pt-6">
                  {showDeleteConfirm ? (
                    <div className="bg-m3-error-container text-m3-on-error-container p-4 rounded-2xl">
                      <p className="text-sm font-bold mb-4">Are you sure? This will also delete all payment history for this tenant.</p>
                      <div className="flex gap-3">
                        <button type="button" onClick={confirmDeleteTenant} className="flex-1 bg-m3-error text-m3-on-error font-bold rounded-full p-3 hover:bg-opacity-90 transition-colors shadow-sm">
                          Yes, Delete
                        </button>
                        <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-m3-surface-variant text-m3-on-surface-variant font-bold rounded-full p-3 hover:bg-opacity-80 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button type="submit" className="flex-1 bg-m3-primary text-m3-on-primary font-bold rounded-full p-4 hover:bg-opacity-90 transition-colors shadow-sm">
                        Update
                      </button>
                      <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex-1 bg-m3-error-container text-m3-on-error-container font-bold rounded-full p-4 hover:bg-opacity-90 transition-colors shadow-sm">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>
      </div>

      {/* FAB for Add Tenant */}
      <button 
        onClick={() => {
          if (isGuest && activeTenants.length >= 5) {
            setShowGuestLimitDialog(true);
          } else {
            setIsAddTenantModalOpen(true);
          }
        }}
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-16 h-16 bg-m3-primary-container text-m3-on-primary-container rounded-2xl shadow-lg flex items-center justify-center hover:bg-opacity-80 transition-all z-40"
      >
        <Plus className="w-8 h-8" />
      </button>

      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      
      <GuestLimitModal isOpen={showGuestLimitDialog} onClose={() => setShowGuestLimitDialog(false)} />
      
      <LogoutConfirmModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />

      {/* Confirmation Dialog for Add Tenant */}
      {confirmAddTenant && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-m3-surface rounded-3xl w-full max-w-sm max-h-full md:max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <h3 className="text-xl font-bold text-m3-on-surface mb-4">Confirm New Tenant</h3>
            <div className="text-sm text-m3-on-surface-variant space-y-2 mb-6">
              <p>You are about to add:</p>
              <ul className="list-disc pl-5 font-medium">
                <li>Name: {name}</li>
                <li>{propertyType}: {flat}</li>
                <li>Rent: ৳{rent}</li>
                <li>Join Date: {format(new Date(joinDate), 'dd MMM yyyy')}</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setConfirmAddTenant(false)} className="px-5 py-2.5 rounded-full border border-m3-primary text-m3-primary font-bold hover:bg-m3-primary/10 transition-colors">
                Re-edit
              </button>
              <button onClick={executeAddTenant} className="px-5 py-2.5 rounded-full bg-m3-primary text-m3-on-primary font-bold hover:bg-opacity-90 transition-colors shadow-sm">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Update Tenant */}
      {confirmUpdateTenant && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-m3-surface rounded-3xl w-full max-w-sm max-h-full md:max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <h3 className="text-xl font-bold text-m3-on-surface mb-4">Confirm Update</h3>
            <div className="text-sm text-m3-on-surface-variant space-y-2 mb-6">
              <p>You are about to update tenant details for <strong>{editName}</strong>.</p>
              <p>Changes will be saved permanently.</p>
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setConfirmUpdateTenant(false)} className="px-5 py-2.5 rounded-full border border-m3-primary text-m3-primary font-bold hover:bg-m3-primary/10 transition-colors">
                Re-edit
              </button>
              <button onClick={executeUpdateTenant} className="px-5 py-2.5 rounded-full bg-m3-primary text-m3-on-primary font-bold hover:bg-opacity-90 transition-colors shadow-sm">
                Save Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Payment (Fully Paid handling) */}
      {confirmPayment && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-m3-surface rounded-3xl w-full max-w-sm max-h-full md:max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <h3 className="text-xl font-bold text-m3-on-surface mb-2">Confirm Payment</h3>
            <div className="text-sm text-m3-on-surface-variant space-y-2 mb-8">
              <p>Amount: <strong className="text-lg">৳{paymentAmount}</strong></p>
              <p>Month: <strong>{paymentMonth} {paymentYear}</strong></p>
              {paymentFullyPaid && <p className="text-m3-success font-bold mt-2">🎉 This month's rent will be fully paid.</p>}
            </div>
            
            {paymentFullyPaid ? (
              <div className="flex justify-between items-center sm:gap-4 gap-2 mt-2">
                <button onClick={() => executeAddPayment(true)} className="w-1/2 flex items-center justify-center py-2.5 rounded-full bg-m3-primary-container text-m3-on-primary-container font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-opacity-90 transition-colors shadow-sm">
                  Collect Slip
                </button>
                <div className="flex w-1/2 gap-2 justify-end">
                  <button onClick={() => setConfirmPayment(false)} className="px-3 sm:px-4 py-2.5 rounded-full border border-m3-primary text-m3-primary font-bold text-xs sm:text-sm hover:bg-m3-primary/10 transition-colors">
                    Re-edit
                  </button>
                  <button onClick={() => executeAddPayment(false)} className="px-3 sm:px-4 py-2.5 rounded-full bg-m3-primary text-m3-on-primary font-bold text-xs sm:text-sm hover:bg-opacity-90 transition-colors shadow-sm">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 justify-end mt-2">
                <button onClick={() => setConfirmPayment(false)} className="px-5 py-2.5 rounded-full border border-m3-primary text-m3-primary font-bold hover:bg-m3-primary/10 transition-colors">
                  Re-edit
                </button>
                <button onClick={() => executeAddPayment(false)} className="px-5 py-2.5 rounded-full bg-m3-primary text-m3-on-primary font-bold hover:bg-opacity-90 transition-colors shadow-sm">
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto Payment Slip UI */}
      <SlipDialog 
        slipData={slipData} 
        isOpen={showSlipDialog} 
        onClose={() => setShowSlipDialog(false)} 
      />

      {showAbout && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-m3-surface rounded-3xl w-full max-w-md max-h-full md:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-m3-surface-variant p-5 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-m3-on-surface-variant">About Rent Flow</h2>
              <button onClick={() => setShowAbout(false)} className="p-2 text-m3-on-surface-variant hover:bg-black/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-m3-on-surface">
              <p className="font-medium">
                <strong>Rent Flow</strong> is a smart property management application designed to simplify the lives of landlords and property managers.
              </p>
              <p className="text-sm">
                <strong>What it does:</strong><br/>
                It tracks your tenants, manages monthly rent collections, and keeps a detailed history of payments. It automatically calculates due amounts and highlights who has paid and who hasn't.
              </p>
              <p className="text-sm">
                <strong>Problems it solves:</strong><br/>
                - Eliminates manual record-keeping in notebooks or spreadsheets.<br/>
                - Prevents disputes over payment history.<br/>
                - Provides a clear, real-time overview of your property income.<br/>
                - Keeps all tenant information (NID, contact details, advance deposits) in one secure place.
              </p>
              <p className="text-xs text-center text-m3-on-surface-variant mt-6 pt-4 border-t border-m3-surface-variant">
                Version 1.0.0 &copy; 2026
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

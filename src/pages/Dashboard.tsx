import { useState, useEffect } from 'react';
import { type Tenant, type Payment } from '../supabase';
import { getTenants, getPayments } from '../dataService';
import { useAuth } from '../AuthContext';
import { format, getDaysInMonth, getDate, parse } from 'date-fns';
import { Link } from 'react-router-dom';
import { Plus, CreditCard, List, X, User, Wallet, LogOut, Mail, Star, Info, Palette } from 'lucide-react';
import ProfileModal from '../components/ProfileModal';
import ThemeModal from '../components/ThemeModal';
import LogoutConfirmModal from '../components/LogoutConfirmModal';

export default function Dashboard() {
  const { user, isGuest, signOut } = useAuth();
  const today = new Date();
  const currentDay = getDate(today);
  const daysInMonth = getDaysInMonth(today);
  const daysRemaining = daysInMonth - currentDay;

  const [selectedMonth, setSelectedMonth] = useState(format(today, 'yyyy-MM'));
  const qMonth = format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMM');
  const qYear = format(parse(selectedMonth, 'yyyy-MM', new Date()), 'yyyy');

  const [isDueListModalOpen, setIsDueListModalOpen] = useState(false);
  const [isPaidListModalOpen, setIsPaidListModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [stats, setStats] = useState<{
    activeCount: number;
    paidCount: number;
    dueCount: number;
    totalCollected: number;
    totalOutstandingDue: number;
    dueList: Array<{ id: string; name: string; photo?: string; dueAmount: number }>;
    paidList: Array<{ id: string; name: string; photo?: string; monthly_rent: number; paidAmount: number; dueAmount: number }>;
  } | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const allTenants = await getTenants();
      const allPayments = await getPayments();
      const currentMonthPayments = allPayments.filter(p => p.month === qMonth && p.year === qYear);

      if (!allTenants) return;

      const active = allTenants.filter((t: Tenant) => {
        if (!t.is_active) return false;
        if (t.joining_date) {
          const joinMonth = t.joining_date.substring(0, 7); // yyyy-MM
          if (joinMonth > selectedMonth) {
            return false;
          }
        }
        return true;
      });

      let totalCollected = 0;
      let totalOutstandingDue = 0;
      let paidCount = 0;
      let dueCount = 0;
      const dueList: Array<{ id: string; name: string; photo?: string; dueAmount: number }> = [];
      const paidList: Array<{ id: string; name: string; photo?: string; monthly_rent: number; paidAmount: number; dueAmount: number }> = [];

      active.forEach((tenant: Tenant) => {
        const tenantPayments = (currentMonthPayments || []).filter((p: Payment) => p.tenant_id === tenant.id);
        const paidThisMonth = tenantPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
        
        totalCollected += paidThisMonth;
        
        const due = tenant.monthly_rent - paidThisMonth;
        
        if (paidThisMonth > 0) {
          paidList.push({
            id: tenant.id,
            name: tenant.name,
            photo: tenant.photo,
            monthly_rent: tenant.monthly_rent,
            paidAmount: paidThisMonth,
            dueAmount: due > 0 ? due : 0
          });
        }

        if (due > 0) {
          totalOutstandingDue += due;
          dueCount++;
          dueList.push({
            id: tenant.id,
            name: tenant.name,
            photo: tenant.photo,
            dueAmount: due
          });
        } else {
          paidCount++;
        }
      });

      setStats({
        activeCount: active.length,
        paidCount,
        dueCount,
        totalCollected,
        totalOutstandingDue,
        dueList,
        paidList
      });
    }

    fetchStats();
  }, [selectedMonth, qMonth, qYear]);

  if (!stats) return <div className="p-4">Loading...</div>;

  const selectedMonthName = format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy');
  const totalExpected = stats.totalCollected + stats.totalOutstandingDue;
  const collectedPercentage = totalExpected > 0 ? Math.round((stats.totalCollected / totalExpected) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 gap-2">
        <div className="flex items-center gap-3 shrink-0">
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
                <div className="absolute left-0 mt-2 w-64 bg-m3-surface border border-m3-surface-variant rounded-2xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200 origin-top-left">
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
          <h1 className="text-xl sm:text-2xl font-bold text-m3-on-surface whitespace-nowrap">Rent Flow</h1>
        </div>
        <input 
          type="month" 
          value={selectedMonth} 
          onChange={e => setSelectedMonth(e.target.value)} 
          className="border-none bg-m3-surface-variant text-m3-on-surface-variant rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-m3-primary outline-none max-w-[120px] sm:max-w-none"
        />
      </div>
      
      <div className="bg-m3-primary-container text-m3-on-primary-container rounded-3xl p-6 mb-6 shadow-sm">
        <h2 className="text-sm font-medium mb-1 opacity-80">Days remaining in month</h2>
        <p className="text-5xl font-bold">{daysRemaining} <span className="text-2xl font-medium">Days</span></p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center">
          <p className="text-xs text-m3-on-surface-variant font-medium text-center mb-1">Active</p>
          <p className="text-3xl font-bold text-m3-on-surface">{stats.activeCount}</p>
        </div>
        <div className="bg-m3-success-container border border-m3-success-container rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center">
          <p className="text-xs text-m3-on-success-container font-medium text-center mb-1">Paid</p>
          <p className="text-3xl font-bold text-m3-on-success-container">{stats.paidCount}</p>
        </div>
        <div className="bg-m3-error-container border border-m3-error-container rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center">
          <p className="text-xs text-m3-on-error-container font-medium text-center mb-1">Due</p>
          <p className="text-3xl font-bold text-m3-on-error-container">{stats.dueCount}</p>
        </div>
      </div>

      {/* Quick Actions Widget */}
      <div className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-6 mb-6 shadow-sm">
        <h2 className="text-base font-bold text-m3-on-surface mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <Link to="/admin" state={{ openAddTenant: true }} className="flex flex-col items-center justify-center p-3 bg-m3-secondary-container text-m3-on-secondary-container rounded-2xl hover:bg-opacity-80 transition-colors">
            <Plus className="w-6 h-6 mb-2" />
            <span className="text-[11px] font-bold text-center uppercase tracking-wider">Add Tenant</span>
          </Link>
          <Link to="/admin" state={{ focusPayment: true }} className="flex flex-col items-center justify-center p-3 bg-m3-secondary-container text-m3-on-secondary-container rounded-2xl hover:bg-opacity-80 transition-colors">
            <CreditCard className="w-6 h-6 mb-2" />
            <span className="text-[11px] font-bold text-center uppercase tracking-wider">Add Payment</span>
          </Link>
          <button onClick={() => setIsDueListModalOpen(true)} className="flex flex-col items-center justify-center p-3 bg-m3-error-container text-m3-on-error-container rounded-2xl hover:bg-opacity-80 transition-colors">
            <List className="w-6 h-6 mb-2" />
            <span className="text-[11px] font-bold text-center uppercase tracking-wider">Due List</span>
          </button>
          <button onClick={() => setIsPaidListModalOpen(true)} className="flex flex-col items-center justify-center p-3 bg-m3-success-container text-m3-on-success-container rounded-2xl hover:bg-opacity-80 transition-colors">
            <Wallet className="w-6 h-6 mb-2" />
            <span className="text-[11px] font-bold text-center uppercase tracking-wider">Paid List</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-sm font-medium text-m3-on-surface-variant mb-1">Total Collected ({selectedMonthName})</p>
              <p className="text-4xl font-bold text-m3-on-surface">৳{stats.totalCollected.toFixed(2)}</p>
            </div>
            <span className="text-sm font-bold text-m3-on-primary-container bg-m3-primary-container px-3 py-1 rounded-full">{collectedPercentage}%</span>
          </div>
          <div className="w-full bg-m3-surface-variant rounded-full h-3 mt-2 overflow-hidden">
            <div className="bg-m3-primary h-3 rounded-full transition-all duration-500" style={{ width: `${collectedPercentage}%` }}></div>
          </div>
        </div>
        
        <div className="bg-m3-error-container rounded-3xl p-6 shadow-sm">
          <p className="text-sm font-medium text-m3-on-error-container mb-1 opacity-80">Total Due ({selectedMonthName})</p>
          <p className="text-4xl font-bold text-m3-on-error-container">৳{stats.totalOutstandingDue.toFixed(2)}</p>
        </div>
      </div>

      {/* Due List Modal */}
      {isDueListModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-m3-surface rounded-3xl w-full max-w-md max-h-full md:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-m3-surface-variant p-5 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-m3-on-surface-variant">Due List ({selectedMonthName})</h2>
              <button onClick={() => setIsDueListModalOpen(false)} className="p-2 text-m3-on-surface-variant hover:bg-black/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {stats.dueList.length === 0 ? (
                <p className="text-center text-m3-on-surface-variant py-8">No due rent for this month!</p>
              ) : (
                <div className="space-y-3">
                  {stats.dueList.map(tenant => (
                    <div key={tenant.id} className="flex items-center justify-between p-4 bg-m3-surface border border-m3-surface-variant rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-m3-primary-container text-m3-on-primary-container rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {tenant.photo ? (
                            <img src={tenant.photo} alt={tenant.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6" />
                          )}
                        </div>
                        <span className="font-bold text-m3-on-surface text-lg">{tenant.name}</span>
                      </div>
                      <span className="font-bold text-m3-error text-lg">৳{tenant.dueAmount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Paid List Modal */}
      {isPaidListModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-m3-surface rounded-3xl w-full max-w-md max-h-full md:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-m3-surface-variant p-5 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-m3-on-surface-variant">Paid List ({selectedMonthName})</h2>
              <button onClick={() => setIsPaidListModalOpen(false)} className="p-2 text-m3-on-surface-variant hover:bg-black/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {stats.paidList.length === 0 ? (
                <p className="text-center text-m3-on-surface-variant py-8">No payments recorded for this month yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.paidList.map(tenant => (
                    <div key={tenant.id} className="flex items-center justify-between p-4 bg-m3-surface border border-m3-surface-variant rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-m3-primary-container text-m3-on-primary-container rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {tenant.photo ? (
                            <img src={tenant.photo} alt={tenant.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-m3-on-surface text-lg block">{tenant.name}</span>
                          <span className="text-sm text-m3-on-surface-variant">Rent: ৳{tenant.monthly_rent}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-m3-success text-lg block">Paid: ৳{tenant.paidAmount}</span>
                        {tenant.dueAmount > 0 && <span className="text-sm font-bold text-m3-error">Due: ৳{tenant.dueAmount}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      
      <ThemeModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />
      
      <LogoutConfirmModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />

      {showAbout && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-m3-surface rounded-3xl w-full max-w-md max-h-full md:max-h-[90vh] shadow-2xl flex flex-col overflow-y-auto">
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

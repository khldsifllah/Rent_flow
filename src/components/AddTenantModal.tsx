import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { type Tenant } from '../supabase';
import { getTenants, addTenant } from '../dataService';
import { format } from 'date-fns';
import { X, User, Plus } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { compressImage } from '../utils/imageUtils';
import GuestLimitModal from './GuestLimitModal';

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTenantModal({ isOpen, onClose, onSuccess }: AddTenantModalProps) {
  const { isGuest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [showGuestLimitDialog, setShowGuestLimitDialog] = useState(false);

  // Form Fields State
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

  // Confirmations
  const [confirmAddTenant, setConfirmAddTenant] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  useEffect(() => {
    async function loadTenants() {
      const data = await getTenants();
      if (data) setAllTenants(data);
      setLoading(false);
    }
    if (isOpen) {
      loadTenants();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleAddTenant = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !rent || !dueDay) return;

    const activeCount = allTenants.filter(t => t.is_active).length;
    if (isGuest && activeCount >= 5) {
      setShowGuestLimitDialog(true);
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

    // Reset fields
    setPhoto('');
    setName('');
    setMobile('');
    setNid('');
    setPropertyType('Flat');
    setFlat('');
    setRent('');
    setAdvance('');
    setDueDay('');
    setJoinDate(format(new Date(), 'yyyy-MM-dd'));

    onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-m3-surface rounded-3xl w-full max-w-md max-h-full md:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-m3-surface-variant">
          <div className="sticky top-0 bg-m3-surface-variant border-b border-m3-surface-variant p-5 flex justify-between items-center z-10">
            <div className="flex items-center gap-2 text-m3-on-surface-variant">
              <Plus className="w-5 h-5 text-m3-primary" />
              <h2 className="text-xl font-bold">Add New Tenant</h2>
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

            <form onSubmit={handleAddTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Name *</label>
                <input 
                  required 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" 
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Profile Photo</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoChange} 
                  className="w-full bg-m3-surface-variant text-m3-on-surface-variant rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" 
                />
                {photo && (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={photo} alt="Preview" className="w-16 h-16 object-cover rounded-2xl border-2 border-m3-primary/20" />
                    <button type="button" onClick={() => setPhoto('')} className="text-xs text-m3-error font-semibold hover:underline">Remove</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Mobile</label>
                  <input 
                    type="tel" 
                    value={mobile} 
                    onChange={e => setMobile(e.target.value)} 
                    className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" 
                    placeholder="017xxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">NID</label>
                  <input 
                    type="text" 
                    value={nid} 
                    onChange={e => setNid(e.target.value)} 
                    className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" 
                    placeholder="National ID"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Property Type</label>
                  <select 
                    value={propertyType} 
                    onChange={e => setPropertyType(e.target.value as 'Flat' | 'Shop' | 'Both')} 
                    className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none"
                  >
                    <option value="Flat">Flat</option>
                    <option value="Shop">Shop</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Property Name/No.</label>
                  <input 
                    type="text" 
                    value={flat} 
                    onChange={e => setFlat(e.target.value)} 
                    className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" 
                    placeholder="e.g. 4A / No. 12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Monthly Rent *</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={rent} 
                    onChange={e => setRent(e.target.value)} 
                    className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" 
                    placeholder="৳"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Advance Deposit</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={advance} 
                    onChange={e => setAdvance(e.target.value)} 
                    className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none" 
                    placeholder="৳"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Due Date (Day) *</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    max="31" 
                    value={dueDay} 
                    onChange={e => setDueDay(e.target.value)} 
                    className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none text-center" 
                    placeholder="1 to 31"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-m3-on-surface-variant mb-1 uppercase tracking-wider">Join Date</label>
                  <input 
                    type="date" 
                    value={joinDate} 
                    onChange={e => setJoinDate(e.target.value)} 
                    className="w-full bg-m3-surface-variant text-m3-on-surface rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-m3-primary outline-none text-center" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-m3-primary text-m3-on-primary font-bold rounded-full p-4 mt-6 hover:bg-opacity-90 transition-colors uppercase tracking-wider text-sm shadow-md"
              >
                Save Tenant
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmAddTenant && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <div className="bg-m3-surface rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 border border-m3-surface-variant">
            <h3 className="text-xl font-bold text-m3-on-surface mb-4">Confirm New Tenant</h3>
            <div className="text-sm text-m3-on-surface-variant space-y-2 mb-6">
              <p>You are about to add:</p>
              <ul className="list-disc pl-5 font-medium space-y-1">
                <li>Name: <strong>{name}</strong></li>
                <li>{propertyType}: <strong>{flat || 'N/A'}</strong></li>
                <li>Rent: <strong className="text-m3-primary">৳{rent}</strong></li>
                {advance && <li>Deposit: <strong className="text-m3-success">৳{advance}</strong></li>}
                <li>Due Date: <strong>{dueDay}th of month</strong></li>
                <li>Join Date: <strong>{format(new Date(joinDate), 'dd MMM yyyy')}</strong></li>
              </ul>
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button 
                onClick={() => setConfirmAddTenant(false)} 
                className="px-5 py-2.5 rounded-full border border-m3-primary text-m3-primary font-bold hover:bg-m3-primary/10 transition-colors text-sm"
              >
                Re-edit
              </button>
              <button 
                onClick={executeAddTenant} 
                className="px-5 py-2.5 rounded-full bg-m3-primary text-m3-on-primary font-bold hover:bg-opacity-90 transition-colors shadow-sm text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Limit Dialog */}
      <GuestLimitModal isOpen={showGuestLimitDialog} onClose={() => setShowGuestLimitDialog(false)} />
    </>
  );
}

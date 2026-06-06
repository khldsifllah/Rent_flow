import React, { useState, useEffect } from 'react';
import { X, User, Shield, KeyRound, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { compressImage } from '../utils/imageUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateUserContext } = useAuth();
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhoto(user.profile_picture || '');
      setUniqueId(user.id.substring(0, 8));
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        const compressedBase64 = await compressImage(file, 200, 200); 
        setPhoto(compressedBase64);
        setMsg({ text: "✨ Image selected! Save changes to apply.", type: 'success' });
      } catch (err) {
        console.error("Error compressing image", err);
        setMsg({ text: "Unable to process picture. Try a smaller file.", type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const authUpdate = await supabase.auth.updateUser({
      data: {
        full_name: name,
        avatar_url: photo,
      }
    });

    if (authUpdate.error) {
      console.error('Profile Update Error:', authUpdate.error);
      setMsg({ text: 'Error saving profile: ' + authUpdate.error.message, type: 'error' });
    } else {
      console.log('Profile updated successfully');
      setMsg({ text: '✨ Profile customized successfully!', type: 'success' });
      updateUserContext({ name, profile_picture: photo });
      setTimeout(() => {
        onClose();
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md max-h-[92vh] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden border border-slate-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sticky Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-white/90 dark:bg-zinc-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Shield className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-neutral-100">Customize Profile</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-350 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {msg && (
            <div className={`p-3.5 rounded-2xl mb-5 text-xs font-bold leading-relaxed flex items-start gap-2.5 border ${
              msg.type === 'error' 
                ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-950/50' 
                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/50'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 animate-pulse shrink-0" />
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Elegant Picture Upload Card Area */}
            <div className="flex flex-col items-center py-2 bg-slate-50/55 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800 rounded-2xl p-4">
              <div className="relative group">
                {/* Visual Circle Frame */}
                <div className="w-24 h-24 bg-slate-150 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-white dark:border-zinc-900 shadow-md ring-4 ring-indigo-50 dark:ring-indigo-950/50 transition-all duration-200 group-hover:scale-[1.02]">
                  {photo ? (
                    <img src={photo} alt="Profile avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400 dark:text-zinc-500" />
                  )}
                </div>
                
                {/* Floating Action Trigger Badge */}
                <label className="absolute -bottom-1 -right-1 bg-indigo-600 dark:bg-indigo-500 text-white p-2 rounded-full cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-all duration-150">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={loading} />
                </label>
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-neutral-500 mt-3 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> profile picture
              </span>
            </div>

            {/* Fields Details Section */}
            <div className="space-y-4">
              
              {/* Full Name Input Column */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 dark:text-neutral-400 mb-1.5 uppercase tracking-wider ml-0.5">
                  Full Name
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500 transition-colors group-focus-within/input:text-indigo-600">
                    <User className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <input 
                    required 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    disabled={loading}
                    className="w-full bg-slate-50 dark:bg-zinc-950/40 text-slate-800 dark:text-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm border border-slate-200/60 dark:border-zinc-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all placeholder-slate-450 dark:placeholder-zinc-650" 
                    placeholder="Enter full name" 
                  />
                </div>
              </div>

              {/* Read Only Managed Identity ID Column */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 dark:text-neutral-400 mb-1.5 uppercase tracking-wider ml-0.5">
                  User ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input 
                    type="text" 
                    value={uniqueId} 
                    readOnly 
                    className="w-full bg-slate-50/65 dark:bg-zinc-950/15 text-slate-500 dark:text-zinc-400 rounded-xl pl-10 pr-20 py-2.5 text-sm border border-slate-100 dark:border-zinc-850/50 outline-none font-mono cursor-not-allowed uppercase" 
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-neutral-500 bg-slate-150 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      Secured
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Premium action submit handler */}
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-indigo-600 dark:bg-indigo-500 text-white font-extrabold rounded-xl py-3 shadow-md hover:bg-indigo-500 dark:hover:bg-indigo-400 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-75 disabled:pointer-events-none text-sm leading-none"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Profile</span>
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

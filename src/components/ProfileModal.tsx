import React, { useState, useEffect } from 'react';
import { X, User, Check, AppWindow } from 'lucide-react';
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
        setMsg({ text: "ছবি নির্বাচন করা হয়েছে! পরিবর্তনগুলো সংরক্ষণ করতে নিচের বোতামটি চাপুন। (Photo selected! Click save below to apply.)", type: 'success' });
      } catch (err) {
        console.error("Error compressing image", err);
        setMsg({ text: "ছবিটি বড় হতে পারে। অনুগ্রহ করে ছোট ছবি ব্যবহার করুন। (Failed to process photo. Try a smaller image file.)", type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMsg({ text: "অনুগ্রহ করে আপনার নাম দিন। (Full Name is required.)", type: 'error' });
      return;
    }

    setLoading(true);
    setMsg(null);

    const authUpdate = await supabase.auth.updateUser({
      data: {
        full_name: name.trim(),
        avatar_url: photo,
      }
    });

    if (authUpdate.error) {
      console.error('Profile Update Error:', authUpdate.error);
      setMsg({ text: 'ত্রুটি ঘটেছে: ' + authUpdate.error.message, type: 'error' });
    } else {
      try {
        await supabase.from('users').upsert({ id: user.id, name: name.trim() });
      } catch (dbErr) {
        console.warn("Failed to update users table:", dbErr);
      }
      setMsg({ text: '✅ প্রোফাইল সফলভাবে পরিবর্তন করা হয়েছে! (Profile updated successfully!)', type: 'success' });
      updateUserContext({ name: name.trim(), profile_picture: photo });
      setTimeout(() => {
        onClose();
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div 
        id="profile-modal-container"
        className="bg-m3-surface text-m3-on-surface rounded-2xl w-full max-w-md max-h-[90vh] shadow-xl flex flex-col overflow-hidden border border-m3-surface-variant/40 animate-in fade-in duration-100"
      >
        
        {/* Simple Header */}
        <div className="px-6 py-4.5 border-b border-m3-surface-variant flex justify-between items-center bg-m3-surface sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center">
              <User className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-m3-on-surface">আমার প্রোফাইল</h2>
              <p className="text-[11px] text-m3-on-surface-variant font-medium uppercase tracking-wider">Customize Profile</p>
            </div>
          </div>
          <button 
            id="close-profile-btn"
            onClick={onClose} 
            className="p-1.5 text-m3-on-surface-variant hover:text-m3-on-surface rounded-full hover:bg-m3-surface-variant transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {msg && (
            <div className={`p-4 rounded-xl text-xs font-medium leading-relaxed border ${
              msg.type === 'error' 
                ? 'bg-m3-error-container text-m3-on-error-container border-m3-error/20' 
                : 'bg-m3-success-container/30 text-m3-on-success-container border-m3-success/20'
            }`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Extremely Clean & Clean Profile Photo Area */}
            <div className="flex flex-col items-center justify-center py-4 bg-m3-surface-variant/40 rounded-xl border border-m3-surface-variant/50">
              <div className="relative">
                {/* Minimalist Round Avatar */}
                <div className="w-20 h-20 bg-m3-surface rounded-full flex items-center justify-center overflow-hidden border-2 border-m3-primary/30 shadow-sm">
                  {photo ? (
                    <img src={photo} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-m3-on-surface-variant/60" />
                  )}
                </div>
                
                {/* Change photo button */}
                <label className="absolute bottom-0 right-0 bg-m3-primary text-m3-on-primary hover:bg-m3-primary/95 p-1.5 rounded-full cursor-pointer shadow-md transition-all active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                  <input id="profile-photo-input" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={loading} />
                </label>
              </div>
              <p className="text-[11px] font-bold text-m3-on-surface-variant mt-3 uppercase tracking-wider">
                প্রোফাইল ছবি পরিবর্তন করুন (Change Photo)
              </p>
            </div>

            {/* Input fields */}
            <div className="space-y-4">
              
              {/* Full Name field */}
              <div>
                <label className="block text-[11px] font-bold text-m3-on-surface-variant mb-1.5 uppercase tracking-wider">
                  পুরো নাম (Full Name)
                </label>
                <input 
                  id="profile-name-input"
                  required 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  disabled={loading}
                  className="w-full bg-m3-surface text-m3-on-surface rounded-xl px-4 py-3 text-sm border border-m3-surface-variant focus:border-m3-primary outline-none transition-all placeholder:text-m3-on-surface-variant/40" 
                  placeholder="আপনার নাম লিখুন (e.g. মো: আব্দুর রহমান)" 
                />
              </div>

              {/* Read-only User Unique ID Block */}
              <div>
                <label className="block text-[11px] font-bold text-m3-on-surface-variant mb-1.5 uppercase tracking-wider">
                  ইউজার আইডি (User ID)
                </label>
                <div className="bg-m3-surface-variant/20 rounded-xl px-4 py-3 text-xs border border-m3-surface-variant/40 text-m3-on-surface-variant flex justify-between items-center font-mono">
                  <span>{uniqueId.toUpperCase()}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-m3-on-surface-variant bg-m3-surface-variant px-2 py-0.5 rounded">
                    সিস্টেম আইডি (ID)
                  </span>
                </div>
              </div>

            </div>

            {/* Submit Action */}
            <button 
              id="save-profile-btn"
              type="submit" 
              disabled={loading} 
              className="w-full bg-m3-primary text-m3-on-primary font-bold rounded-xl py-3.5 shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>প্রোফাইল সংরক্ষণ করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Check className="w-4.5 h-4.5 stroke-[2.5]" />
                  <span>তথ্য আপডেট করুন (Save Profile)</span>
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

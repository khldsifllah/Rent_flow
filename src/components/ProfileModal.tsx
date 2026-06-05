import React, { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
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
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhoto(user.profile_picture || '');
      setUniqueId(user.id.substring(0, 8)); // Just a display ID or they can set a custom one if we had a column. We'll just use it as a display for now.
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 150, 150); // Aggressive downsize to avoid Supabase metadata limit
        setPhoto(compressedBase64);
      } catch (err) {
        console.error("Error compressing image", err);
      }
    }
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    const authUpdate = await supabase.auth.updateUser({
      data: {
        full_name: name,
        avatar_url: photo,
      }
    });

    if (authUpdate.error) {
      console.error('Profile Update Error:', authUpdate.error);
      setMsg('Error saving profile: ' + authUpdate.error.message);
    } else {
      console.log('Profile updated successfully');
      setMsg('Profile updated successfully!');
      updateUserContext({ name, profile_picture: photo });
      setTimeout(() => {
        onClose();
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-m3-surface rounded-[2rem] w-full max-w-md max-h-[90vh] shadow-2xl flex flex-col overflow-y-auto border border-white/5 ring-1 ring-black/5">
        <div className="sticky top-0 bg-m3-surface/80 backdrop-blur-xl p-5 flex justify-between items-center z-10 border-b border-m3-surface-variant">
          <h2 className="text-xl font-bold tracking-tight text-m3-on-surface">Your Profile</h2>
          <button onClick={onClose} className="p-2 text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {msg && (
            <div className={`p-4 rounded-2xl mb-6 text-sm font-medium flex items-center gap-2 ${msg.includes('Error') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
              {msg}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-28 h-28 bg-m3-surface-variant text-m3-on-surface-variant rounded-full flex items-center justify-center overflow-hidden mb-4 border-4 border-m3-background shadow-lg transition-transform group-hover:scale-105">
                  {photo ? (
                    <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 opacity-50" />
                  )}
                </div>
                <label className="absolute bottom-4 right-0 bg-m3-primary text-m3-on-primary p-2.5 rounded-full cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-m3-on-surface-variant mb-1.5 uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-m3-on-surface-variant">
                    <User className="w-5 h-5 opacity-60" />
                  </div>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-m3-surface-variant/50 text-m3-on-surface rounded-2xl pl-12 pr-4 py-3.5 text-base focus:ring-2 focus:ring-m3-primary outline-none transition-shadow" placeholder="Your full name" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-m3-on-surface-variant mb-1.5 uppercase tracking-wider ml-1">User ID</label>
                <div className="relative">
                  <input type="text" value={uniqueId} readOnly className="w-full bg-m3-surface-variant/30 text-m3-on-surface-variant rounded-2xl px-4 py-3.5 text-base outline-none cursor-not-allowed font-mono opacity-80" />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant bg-m3-surface-variant px-2 py-1 rounded-md">Read Only</span>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-m3-primary text-m3-on-primary font-bold rounded-2xl py-4 hover:bg-m3-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:pointer-events-none mt-4">
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Saving Changes...
                </>
              ) : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuestLimitModal({ isOpen, onClose }: GuestLimitModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative bg-m3-surface rounded-[28px] p-6 w-full max-w-[340px] shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-full overflow-y-auto">
        <h2 className="text-2xl font-normal text-m3-on-surface mb-4">
          Unlock Full Access
        </h2>
        <p className="text-m3-on-surface-variant text-[15px] leading-relaxed mb-6">
          You're using Rent Flow as a guest. Guest accounts are limited to 5 tenants. Sign in with your email to unlock More tenants, secure cloud backup, and access your data from any device.
        </p>
        <div className="flex justify-end gap-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 rounded-full text-m3-primary border border-m3-primary/30 hover:bg-m3-primary/10 hover:border-m3-primary/50 font-medium text-[14px] transition-colors"
          >
            Maybe Later
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/login')} 
            className="px-5 py-2.5 rounded-full text-m3-on-primary bg-m3-primary hover:bg-m3-primary/90 font-medium text-[14px] shadow-sm hover:shadow transition-all"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

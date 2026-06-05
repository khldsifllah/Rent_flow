import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Laptop, X, Check } from 'lucide-react';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemeModal({ isOpen, onClose }: ThemeModalProps) {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const options = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Laptop },
  ] as const;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal / Bottom Sheet */}
      <div className="relative w-full max-w-sm bg-m3-surface rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom flex flex-col border border-m3-surface-variant max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-m3-on-surface">Select Theme</h2>
          <button 
            onClick={onClose}
            className="p-2 text-m3-on-surface-variant hover:bg-m3-surface-variant/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.id;
            
            return (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-200 ${
                  isSelected 
                    ? 'bg-m3-primary/10 text-m3-primary shadow-sm border border-m3-primary/20' 
                    : 'text-m3-on-surface hover:bg-m3-surface-variant/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${isSelected ? 'bg-m3-primary/20' : 'bg-transparent'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold">{option.label}</span>
                </div>
                {isSelected && <Check className="w-5 h-5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

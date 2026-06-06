import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { X, Download, Share2, ShieldCheck, User, Calendar, Landmark, Ticket } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { motion, AnimatePresence } from 'motion/react';

export default function SlipDialog({ slipData, isOpen, onClose }: { slipData: any, isOpen: boolean, onClose: () => void }) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!isOpen || !slipData) return null;

  // Destructure with fallbacks to fully support old and new payload keys cleanly
  const landlordName = slipData.landlordName || slipData.owner_name || 'Landlord';
  const tenantName = slipData.tenantName || slipData.tenant_name || 'Tenant';
  const flatName = slipData.flatName || slipData.flat_name || 'N/A';
  const monthlyRent = slipData.monthlyRent !== undefined ? Number(slipData.monthlyRent) : (Number(slipData.total_amount) || 0);
  const amountPaid = slipData.amountPaid !== undefined ? Number(slipData.amountPaid) : (Number(slipData.total_amount) || 0);
  const billingMonth = slipData.billingMonth || slipData.month || '';
  const billingYear = slipData.billingYear || slipData.year || '';
  const slipNumber = slipData.slipNumber || slipData.slip_number || 'N/A';
  const propertyType = slipData.propertyType || slipData.property_type || 'Flat';

  // State calculations
  const paymentStatus = slipData.paymentStatus || (amountPaid >= monthlyRent ? 'CLEARED' : 'PARTIAL');

  // Memoized floating celebration confetti particles for cleared payments
  const confettiColors = ['#4F46E5', '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];
  const confettiParticles = React.useMemo(() => {
    if (!isOpen || paymentStatus !== 'CLEARED') return [];
    return Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      color: confettiColors[i % confettiColors.length],
      initialX: Math.random() * 60 - 30,
      initialY: Math.random() * 40 - 20,
      targetX: Math.random() * 260 - 130,
      targetY: Math.random() * -350 - 80,
      scale: Math.random() * 0.5 + 0.5,
      rotate: Math.random() * 720,
      borderRadius: Math.random() > 0.4 ? '2px' : '9999px',
      delay: Math.random() * 0.3,
    }));
  }, [isOpen, paymentStatus]);

  // Human-legible date parsing & formatting
  let formattedDatePaid = 'N/A';
  try {
    const rawDate = slipData.datePaid || slipData.date;
    if (rawDate) {
      if (typeof rawDate === 'number') {
        formattedDatePaid = format(new Date(rawDate), 'dd MMM yyyy');
      } else if (typeof rawDate === 'string') {
        if (rawDate.includes('/') || (rawDate.includes('-') && rawDate.length < 15)) {
          formattedDatePaid = rawDate; // Pre-formatted string
        } else {
          formattedDatePaid = format(new Date(rawDate), 'dd MMM yyyy');
        }
      } else if (rawDate instanceof Date) {
        formattedDatePaid = format(rawDate, 'dd MMM yyyy');
      }
    }
  } catch (e) {
    console.error("Error formatting date:", e);
    formattedDatePaid = String(slipData.datePaid || slipData.date || 'N/A');
  }

  const fallbackToClipboardCopy = async () => {
    try {
      const receiptText = `----------------------------------
RENT FLOW - PAYMENT RECEIPT
----------------------------------
Receipt No: ${slipNumber}
Status: ${paymentStatus} ✅
----------------------------------
Landlord: ${landlordName}
Tenant: ${tenantName}
Property: ${flatName} (${propertyType})
Period: ${billingMonth} ${billingYear}
Paid On: ${formattedDatePaid}
----------------------------------
TOTAL AMOUNT: ৳${amountPaid.toLocaleString('en-BD')}
----------------------------------
Receipt generated via Rent Flow.`;

      await navigator.clipboard.writeText(receiptText);
      setToast({
        message: "📋 Slip copied to clipboard! You can paste & share via any app.",
        type: 'success'
      });
    } catch (err) {
      console.log("Clipboard fallback failed", err);
      setToast({
        message: "Could not share or copy. Please take a screenshot.",
        type: 'error'
      });
    }
  };

  const downloadSlip = async (): Promise<Blob | null> => {
    const element = document.getElementById('slip-content');
    if (!element) return null;
    
    // Bounds check scale factor to prevent out-of-memory errors on high-DPI screens
    let scale = window.devicePixelRatio || 2;
    if (scale > 2.5) scale = 2.5;
    if (scale < 1.5) scale = 1.5;
    
    const renderedCanvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY, // Compense for window scroll offset
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight,
      removeContainer: true,
      foreignObjectRendering: false,
      imageTimeout: 5000,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById('slip-content');
        if (clonedElement) {
          clonedElement.style.maxHeight = 'none';
          clonedElement.style.overflow = 'visible';
          clonedElement.style.height = 'auto';
          clonedElement.style.transform = 'none';
          clonedElement.style.padding = '24px';
          clonedElement.style.borderRadius = '16px';
        }
      }
    });
    
    return new Promise((resolve) => {
      renderedCanvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleDownload = async () => {
    try {
      setIsPreparing(true);
      setToast({ message: "⏳ Preparing your download...", type: 'success' });
      
      const blob = await downloadSlip();
      if (!blob) {
        throw new Error("Blob generation failed");
      }
      
      if (Capacitor.isNativePlatform()) {
        const dataUrl = await blobToDataURL(blob);
        const base64Data = dataUrl.split(',')[1];
        const fileName = `RentFlow-Slip-${slipNumber}.jpg`;
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });
        setToast({
          message: `💾 Saved to Documents as ${fileName}`,
          type: 'success'
        });
        setIsPreparing(false);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `RentFlow-Slip-${slipNumber}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setToast({
        message: "💾 Receipt downloaded successfully!",
        type: 'success'
      });
    } catch (error) {
      console.warn("Error downloading slip:", error);
      setToast({
        message: "Download failed. Please try again.",
        type: 'error'
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsPreparing(true);
      setToast({ message: "⏳ Opening sharing options...", type: 'success' });
      
      const blob = await downloadSlip();
      if (!blob) {
        fallbackToClipboardCopy();
        setIsPreparing(false);
        return;
      }
      
      if (Capacitor.isNativePlatform()) {
        try {
          const dataUrl = await blobToDataURL(blob);
          const base64Data = dataUrl.split(',')[1];
          const fileName = `RentFlow-Slip-${slipNumber}.jpg`;
          
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });
          
          await Share.share({
            title: 'Payment Slip',
            text: `Rent payment receipt: ৳${amountPaid} paid by ${tenantName} for ${billingMonth} ${billingYear}.`,
            url: writeResult.uri,
            dialogTitle: 'Share Slip',
          });
        } catch (nativeError: any) {
          const errorMsg = nativeError.message?.toLowerCase() || '';
          if (errorMsg.includes('cancel') || errorMsg.includes('abort') || errorMsg.includes('dismiss')) {
            console.log("Sharing canceled.");
          } else {
            console.warn("File sharing failed, falling back to copy", nativeError);
            fallbackToClipboardCopy();
          }
        }
        setIsPreparing(false);
        return;
      }

      const file = new File(
        [blob], 
        `RentFlow-Slip-${slipNumber}.jpg`, 
        { type: 'image/jpeg' }
      );

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Rent Flow Payment Receipt',
            text: `Payment receipt for ${tenantName} - ${billingMonth} ${billingYear}`,
            files: [file]
          });
        } catch (shareError: any) {
          const errorMsg = shareError.message?.toLowerCase() || '';
          if (shareError.name === 'AbortError' || errorMsg.includes('cancel') || errorMsg.includes('abort')) {
            console.log("Share canceled.");
          } else {
            console.warn("File share failed, falling back to simple copy text...", shareError);
            try {
              await navigator.share({
                title: 'Rent Flow Payment Slip',
                text: `Rent Flow Receipt\nSlip No: ${slipNumber}\nLandlord: ${landlordName}\nTenant: ${tenantName}\nProperty: ${flatName}\nPeriod: ${billingMonth} ${billingYear}\nAmount: ৳${amountPaid.toLocaleString('en-BD')}\nStatus: ${paymentStatus}`,
              });
            } catch (textShareError: any) {
              const txtErrorMsg = textShareError.message?.toLowerCase() || '';
              if (textShareError.name === 'AbortError' || txtErrorMsg.includes('cancel') || txtErrorMsg.includes('abort')) {
                console.log("Text share canceled.");
              } else {
                fallbackToClipboardCopy();
              }
            }
          }
        }
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (error) {
       console.warn("Share routine error:", error);
       fallbackToClipboardCopy();
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
      <div id="slip-modal-card" className="bg-m3-surface rounded-3xl w-full max-w-sm max-h-[90vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-m3-surface-variant/20 shrink-0">
          <h2 className="text-base font-extrabold tracking-tight text-m3-on-surface">Payment Slip</h2>
          <button onClick={onClose} className="p-1.5 text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Scrollable Body container to support full visibility of height-restricted screens */}
        <div id="slip-scroll-container" className="p-4 bg-slate-100/95 dark:bg-zinc-950/70 overflow-y-auto w-full flex-1">
          <div className="flex items-center justify-center py-2 w-full min-h-min relative overflow-hidden">
            {/* Confetti Celebration Particles */}
            {paymentStatus === 'CLEARED' && confettiParticles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute z-0 w-2.5 h-2.5 pointer-events-none"
                style={{
                  backgroundColor: p.color,
                  borderRadius: p.borderRadius,
                  left: '50%',
                  top: '60%',
                }}
                initial={{ opacity: 0, scale: 0, x: p.initialX, y: p.initialY, rotate: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0, p.scale, p.scale, 0],
                  x: p.targetX,
                  y: p.targetY,
                  rotate: p.rotate,
                }}
                transition={{
                  duration: 2.5,
                  delay: p.delay,
                  ease: [0.1, 0.8, 0.3, 1],
                }}
              />
            ))}

            {/* Slip Render Area - Designed elegantly, avoiding clipping */}
            <div ref={slipRef} id="slip-content" className="bg-white text-slate-800 w-full max-w-[325px] p-5 shadow-2xl border border-slate-100 flex flex-col relative shrink-0 rounded-2xl font-sans" style={{ height: 'auto', overflow: 'visible', maxHeight: 'none' }}>
              {/* Top Color Bar accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-700 via-indigo-500 to-emerald-500 z-20" />

              {/* Subtle Brand Watermark */}
              <div className="absolute inset-0 opacity-[0.015] pointer-events-none flex items-center justify-center overflow-hidden select-none">
                <div className="text-5xl font-black rotate-[-35deg] tracking-widest text-indigo-900">RENT FLOW</div>
              </div>

              {/* Dynamic Status Seal Stamp */}
              <div className={`absolute right-4 top-5 border rounded-lg px-2.5 py-1 text-[9px] font-black rotate-[-12deg] tracking-widest uppercase select-none shadow-sm flex items-center gap-1 z-10 ${
                paymentStatus === 'CLEARED'
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/90'
                  : 'border-amber-500 text-amber-600 bg-amber-50/90'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${paymentStatus === 'CLEARED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {paymentStatus}
            </div>

            <div className="relative z-10 pt-1">
              {/* Brand Header */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-2.5 text-left">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 200 200" 
                  className="w-8 h-8 shrink-0"
                >
                  <defs>
                    <linearGradient id="slipMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                    <linearGradient id="slipAccentGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38BDF8" />
                      <stop offset="100%" stopColor="#818CF8" />
                    </linearGradient>
                    <linearGradient id="slipTakaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#34D399" />
                    </linearGradient>
                    <filter id="slipSoftShadow" x="-10%" y="-10%" width="130%" height="130%">
                      <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.2" floodColor="#000000" />
                    </filter>
                    <filter id="slipBgBlur" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="15" />
                    </filter>
                  </defs>

                  <rect width="200" height="200" rx="52" fill="url(#slipMainGrad)" />
                  <circle cx="100" cy="100" r="75" fill="url(#slipAccentGrad)" opacity="0.3" filter="url(#slipBgBlur)" />

                  <g transform="translate(10, 8)" filter="url(#slipSoftShadow)">
                    <rect x="42" y="80" width="44" height="75" rx="10" fill="white" opacity="0.95" />
                    <rect x="54" y="96" width="18" height="15" rx="4" fill="url(#slipMainGrad)" opacity="0.65" />
                    <rect x="54" y="122" width="18" height="15" rx="4" fill="url(#slipMainGrad)" opacity="0.65" />
                    
                    <rect x="94" y="45" width="56" height="110" rx="12" fill="white" />
                    <rect x="112" y="64" width="20" height="16" rx="5" fill="url(#slipMainGrad)" opacity="0.8" />
                    <rect x="112" y="92" width="20" height="16" rx="5" fill="url(#slipMainGrad)" opacity="0.8" />
                    <path d="M112 155 V 128 C 112 121, 117 116, 122 116 H 122 C 127 116, 132 121, 132 128 V 155 Z" fill="url(#slipMainGrad)" opacity="0.9" />
                  </g>

                  <path d="M40 170 C 80 145, 120 195, 160 170" stroke="url(#slipAccentGrad)" strokeWidth="12" strokeLinecap="round" fill="none" filter="url(#slipSoftShadow)" />

                  <circle cx="160" cy="45" r="28" fill="white" filter="url(#slipSoftShadow)" />
                  <circle cx="160" cy="45" r="24" fill="url(#slipTakaGrad)" />
                  <text x="160.5" y="56" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="28" fontWeight="800" fill="white" textAnchor="middle">৳</text>
                </svg>
                <div className="flex flex-col">
                  <h1 className="text-sm font-black tracking-tight text-slate-900">Rent Flow</h1>
                  <p className="text-[7px] text-slate-400 font-extrabold tracking-widest uppercase">Official Payment Receipt</p>
                </div>
              </div>
              
              {/* Core Slip Metadata */}
              <div className="grid grid-cols-2 gap-2 pb-2 mb-2.5 border-b border-slate-100 text-[10px]">
                <div className="text-left">
                  <span className="block text-[7px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Slip No.</span>
                  <span className="font-mono font-extrabold text-indigo-900 bg-indigo-50/70 border border-indigo-150 px-1 py-0.5 rounded text-[8px] inline-block">{slipNumber}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[7px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Date Paid</span>
                  <span className="font-bold text-slate-700 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded text-[8px] inline-block">{formattedDatePaid}</span>
                </div>
              </div>

              {/* Details and Payments Section */}
              <div className="space-y-2.5">
                {/* Billing Period Card */}
                <div className="bg-gradient-to-br from-slate-50/80 to-indigo-50/20 rounded-xl p-2 border border-slate-100 flex justify-between items-center shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-indigo-50 text-indigo-700 rounded-md">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-[6px] text-slate-400 font-bold uppercase tracking-wider">Billing Period</span>
                      <span className="text-[10px] font-black text-slate-800">{billingMonth} {billingYear}</span>
                    </div>
                  </div>
                </div>

                {/* Info block without bilingual labels to keep it professional */}
                <div className="space-y-1.5 text-[9px] bg-slate-50/40 border border-slate-100/60 p-2.5 rounded-xl">
                  {/* Landlord detail */}
                  <div className="flex justify-between items-center pb-1.5 border-b border-dashed border-slate-200/50">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Landmark className="w-3 h-3 text-indigo-500" />
                      <span className="font-bold uppercase tracking-wider text-[7px] text-slate-400">Landlord</span>
                    </div>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]">{landlordName}</span>
                  </div>

                  {/* Tenant detail */}
                  <div className="flex justify-between items-center pb-1.5 border-b border-dashed border-slate-200/50">
                    <div className="flex items-center gap-1 text-slate-500">
                      <User className="w-3 h-3 text-indigo-500" />
                      <span className="font-bold uppercase tracking-wider text-[7px] text-slate-400">Tenant</span>
                    </div>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]">{tenantName}</span>
                  </div>

                  {/* Flat detail */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Ticket className="w-3 h-3 text-indigo-500" />
                      <span className="font-bold uppercase tracking-wider text-[7px] text-slate-400">{propertyType === 'Shop' ? 'Shop ID' : 'Flat ID'}</span>
                    </div>
                    <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[8px]">{flatName}</span>
                  </div>
                </div>

                {/* Problem 2 - Payment Summary that fits beautifully and lists exact items */}
                <div className="bg-slate-50/70 border border-slate-100 p-2.5 rounded-xl space-y-1.5 text-left">
                  <h4 className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-200/50">
                    Payment Summary
                  </h4>
                  
                  <div className="flex justify-between items-center text-[9px] py-0.5">
                    <span className="text-slate-500 font-semibold">Monthly Rent</span>
                    <span className="font-bold text-slate-800">৳{monthlyRent.toLocaleString('en-BD')}</span>
                  </div>

                  <div className="flex justify-between items-center text-[9px] py-0.5">
                    <span className="text-slate-500 font-semibold">Amount Paid</span>
                    <span className="font-bold text-slate-800">৳{amountPaid.toLocaleString('en-BD')}</span>
                  </div>

                  <div className="flex justify-between items-center text-[9px] py-0.5">
                    <span className="text-slate-500 font-semibold">Payment Status</span>
                    <span className={`font-black text-[8px] px-1.5 py-0.5 rounded-md ${
                      paymentStatus === 'CLEARED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50'
                        : 'bg-amber-50 text-amber-700 border border-amber-100/50'
                    }`}>
                      {paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aesthetic Perforation Tear line */}
              <div className="relative my-2.5 -mx-5 h-4 flex items-center pointer-events-none select-none">
                <div className="absolute left-0 -translate-x-1/2 w-3.5 h-3.5 bg-slate-100 dark:bg-zinc-900 rounded-full border border-slate-200/50 z-10"></div>
                <div className="absolute right-0 translate-x-1/2 w-3.5 h-3.5 bg-slate-100 dark:bg-zinc-900 rounded-full border border-slate-200/50 z-10"></div>
                <div className="w-full border-t border-dashed border-slate-200/80"></div>
              </div>

              {/* Bottom Portion - Clean barcode and secure stamp */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-[6px] text-slate-400 font-bold uppercase tracking-wider">Security</span>
                      <span className="text-[8px] text-emerald-600 font-black tracking-wide uppercase">Verified</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-slate-800 tracking-tight flex items-baseline justify-end gap-0.5">
                      <span className="text-[10px] font-extrabold text-slate-500">৳</span>
                      <span className="font-sans font-black leading-none">{amountPaid.toLocaleString('en-BD')}</span>
                    </div>
                  </div>
                </div>

                {/* Clean, authentic looking barcode block avoiding clutter */}
                <div className="pt-1.5 border-t border-slate-100 flex flex-col items-center">
                  <div className="flex justify-center items-stretch h-5 gap-[1px] opacity-85 mb-1 w-full max-w-[150px]">
                    <div className="w-[1.2px] bg-slate-800 h-full"></div>
                    <div className="w-[0.8px] bg-slate-800 h-full"></div>
                    <div className="w-[2.4px] bg-slate-800 h-full"></div>
                    <div className="w-[0.8px] bg-slate-800 h-full"></div>
                    <div className="w-[3px] bg-transparent h-full"></div>
                    <div className="w-[1.2px] bg-slate-800 h-full"></div>
                    <div className="w-[0.8px] bg-slate-800 h-full"></div>
                    <div className="w-[2px] bg-slate-800 h-full"></div>
                    <div className="w-[0.8px] bg-slate-800 h-full"></div>
                    <div className="w-[2.4px] bg-slate-800 h-full"></div>
                    <div className="w-[1.5px] bg-transparent h-full"></div>
                    <div className="w-[1.2px] bg-slate-800 h-full"></div>
                    <div className="w-[3px] bg-slate-800 h-full"></div>
                    <div className="w-[0.8px] bg-slate-800 h-full"></div>
                    <div className="w-[1.5px] bg-transparent h-full"></div>
                    <div className="w-[2px] bg-slate-800 h-full"></div>
                    <div className="w-[0.8px] bg-slate-800 h-full"></div>
                    <div className="w-[2px] bg-slate-800 h-full"></div>
                    <div className="w-[1.2px] bg-slate-800 h-full"></div>
                  </div>
                  <span className="text-[7.5px] font-mono font-bold tracking-wider text-slate-400">REF-{slipNumber}</span>
                  <p className="text-[7.5px] text-slate-400 font-extrabold mt-1">Thank you for choosing Rent Flow!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Action button triggers for PDF export and web sharing */}
        <div className="p-5 bg-m3-surface/90 backdrop-blur-md border-t border-m3-surface-variant/30 flex gap-3.5">
          <button 
            onClick={handleDownload} 
            disabled={isPreparing}
            className="flex-1 flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-2xl py-3 px-3 shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPreparing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-[13px] tracking-wide">Preparing...</span>
              </span>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" /> 
                <span className="text-[13px] tracking-wide">Download</span>
              </>
            )}
          </button>
          <button 
            onClick={handleShare} 
            disabled={isPreparing}
            className="flex-1 flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 font-extrabold rounded-2xl py-3 px-3 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPreparing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-[13px] tracking-wide">Preparing...</span>
              </span>
            ) : (
              <>
                <Share2 className="w-4 h-4 stroke-[2.5]" /> 
                <span className="text-[13px] tracking-wide">Share Receipt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Micro-Interaction Toast overlay notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] w-[90%] max-w-xs font-sans"
          >
            <div className={`px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center justify-between gap-3 border backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-red-500/15 text-red-200 border-red-500/25 shadow-red-500/5'
                : 'bg-emerald-500/15 text-emerald-200 border-emerald-500/25 shadow-emerald-500/5'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span className="leading-snug">{toast.message}</span>
              </div>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-lg hover:bg-white/10 active:scale-90 transition-all text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

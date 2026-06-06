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

  // Memoized floating celebration confetti particles for cleared payments
  const confettiColors = ['#4F46E5', '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];
  const tempMonthlyRent = slipData?.monthlyRent !== undefined ? Number(slipData.monthlyRent) : (Number(slipData?.total_amount) || 0);
  const tempAmountPaid = slipData?.amountPaid !== undefined ? Number(slipData.amountPaid) : (Number(slipData?.total_amount) || 0);
  const tempPaymentStatus = slipData?.paymentStatus || (tempAmountPaid >= tempMonthlyRent ? 'CLEARED' : 'PARTIAL');

  const confettiParticles = React.useMemo(() => {
    if (!isOpen || !slipData || tempPaymentStatus !== 'CLEARED') return [];
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
  }, [isOpen, slipData, tempPaymentStatus]);

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
        message: "📋 Receipt text copied to clipboard! You can share it directly.",
        type: 'success'
      });
    } catch (err) {
      console.log("Clipboard fallback failed", err);
      setToast({
        message: "Could not share. Please take a screenshot.",
        type: 'error'
      });
    }
  };

  const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const downloadSlip = async (): Promise<string | null> => {
    const element = document.getElementById('slip-content');
    if (!element) return null;
    
    // Maintain scale 2 for clean snapshot without resource exhaustion
    const scale = 2;
    
    try {
      const renderedCanvas = await html2canvas(element, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        foreignObjectRendering: false,
        imageTimeout: 10000,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('slip-content');
          if (clonedElement) {
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.overflow = 'visible';
            clonedElement.style.height = 'auto';
            clonedElement.style.transform = 'none';
            clonedElement.style.padding = '24px';
            clonedElement.style.borderRadius = '16px';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.border = 'none';
          }
        }
      });
      
      return renderedCanvas.toDataURL('image/jpeg', 0.95);
    } catch (err) {
      console.error("html2canvas capture failure:", err);
      return null;
    }
  };

  const handleDownload = async () => {
    try {
      setIsPreparing(true);
      setToast({ message: "⏳ Rendering high-fidelity slip...", type: 'success' });
      
      const dataUrl = await downloadSlip();
      if (!dataUrl) {
        throw new Error("Unable to render receipt canvas");
      }
      
      if (Capacitor.isNativePlatform()) {
        const base64Data = dataUrl.split(',')[1];
        const fileName = `RentFlow-Slip-${slipNumber}.jpg`;
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });
        setToast({
          message: `💾 Slip saved to Documents: ${fileName}`,
          type: 'success'
        });
        return;
      }

      // Safe browser anchor click download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `RentFlow-Slip-${slipNumber}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToast({
        message: "💾 Receipt downloaded successfully!",
        type: 'success'
      });
    } catch (error) {
      console.warn("Download error:", error);
      setToast({
        message: "Download failed. Please try again or copy/screenshot.",
        type: 'error'
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsPreparing(true);
      setToast({ message: "⏳ Opening receipt share dialog...", type: 'success' });
      
      const dataUrl = await downloadSlip();
      if (!dataUrl) {
        fallbackToClipboardCopy();
        return;
      }
      
      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = dataUrl.split(',')[1];
          const fileName = `RentFlow-Slip-${slipNumber}.jpg`;
          
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });
          
          await Share.share({
            title: 'Rent Flow Receipt',
            text: `Payment Receipt: ৳${amountPaid} paid by ${tenantName} for ${billingMonth} ${billingYear}.`,
            url: writeResult.uri,
            dialogTitle: 'Share Receipt',
          });
        } catch (nativeError: any) {
          console.warn("Native share failure, fallback to clipboard:", nativeError);
          fallbackToClipboardCopy();
        }
        return;
      }

      // Modern Web Sharing API support check
      const blob = dataURLtoBlob(dataUrl);
      const file = new File([blob], `RentFlow-Slip-${slipNumber}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Rent Flow Payment Receipt',
            text: `Payment receipt completed for ${tenantName} - ${billingMonth} ${billingYear}`,
            files: [file]
          });
        } catch (shareError: any) {
          const errorMsg = shareError.message?.toLowerCase() || '';
          if (shareError.name === 'AbortError' || errorMsg.includes('cancel') || errorMsg.includes('abort')) {
            console.log("Web sharing cancelled.");
          } else {
            console.warn("File sharing failed, trying text sharing:", shareError);
            try {
              await navigator.share({
                title: 'Rent Flow Payment Slip',
                text: `Rent Flow Receipt\nSlip No: ${slipNumber}\nLandlord: ${landlordName}\nTenant: ${tenantName}\nProperty: ${flatName}\nPeriod: ${billingMonth} ${billingYear}\nAmount: ৳${amountPaid.toLocaleString('en-BD')}\nStatus: ${paymentStatus}`,
              });
            } catch (txtErr) {
              fallbackToClipboardCopy();
            }
          }
        }
      } else {
        fallbackToClipboardCopy();
      }
    } catch (error) {
       console.warn("Share logic failure, copying text:", error);
       fallbackToClipboardCopy();
    } finally {
      setIsPreparing(false);
    }
  };

  const dueAmount = Math.max(0, monthlyRent - amountPaid);

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex flex-col items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
      <div id="slip-modal-card" className="bg-m3-surface rounded-3xl w-full max-w-sm max-h-[90vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-m3-surface-variant/20 shrink-0">
          <h2 className="text-base font-extrabold tracking-tight text-m3-on-surface">Payment Slip</h2>
          <button onClick={onClose} className="p-1.5 text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Scrollable Body container to support full visibility of height-restricted screens */}
        <div id="slip-scroll-container" className="p-4 bg-slate-100/95 dark:bg-zinc-950/70 overflow-y-auto w-full flex-1 mx-auto flex flex-col items-center">
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
              {/* Top Color Accent Ribbon */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 z-20 rounded-t-2xl" />

              {/* Dynamic Status Seal Stamp */}
              <div className={`absolute right-4 top-5 border rounded-lg px-2.5 py-1 text-[9px] font-black rotate-[-12deg] tracking-widest uppercase select-none shadow-sm flex items-center gap-1 z-10 ${
                paymentStatus === 'CLEARED'
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/90'
                  : 'border-amber-500 text-amber-600 bg-amber-50/90'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${paymentStatus === 'CLEARED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
                {paymentStatus}
              </div>

              <div className="relative z-10 pt-1">
                {/* Brand Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-150 shrink-0">
                    <ShieldCheck className="w-5 h-5 text-white stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none">Rent Flow</h1>
                    <p className="text-[7.5px] text-slate-400 font-black tracking-widest uppercase mt-0.5">Official Payment Receipt</p>
                  </div>
                </div>
                
                {/* Core Slip Metadata */}
                <div className="grid grid-cols-2 gap-2.5 pb-2.5 mb-3 border-b border-slate-100 text-[10px]">
                  <div className="text-left bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="block text-[6.5px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Slip Number</span>
                    <span className="font-mono font-extrabold text-indigo-900 text-[9px]">{slipNumber}</span>
                  </div>
                  <div className="text-right bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="block text-[6.5px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Date Paid</span>
                    <span className="font-extrabold text-slate-700 text-[9px]">{formattedDatePaid}</span>
                  </div>
                </div>

                {/* Details and Payments Section */}
                <div className="space-y-3">
                  {/* Billing Period Card */}
                  <div className="bg-gradient-to-br from-indigo-50/40 to-blue-50/10 rounded-xl p-2.5 border border-indigo-50 flex justify-between items-center shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-indigo-50 text-indigo-700 rounded-md">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[6px] text-slate-400 font-bold uppercase tracking-wider">Billing Period</span>
                        <span className="text-[11.5px] font-black text-slate-800 leading-none">{billingMonth} {billingYear}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info Blocks */}
                  <div className="space-y-2 text-[9.5px] bg-slate-50/55 p-3 rounded-xl border border-slate-100/70">
                    {/* Landlord detail */}
                    <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200/50">
                      <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                        <Landmark className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-bold uppercase tracking-wider text-[7px] text-slate-400 font-sans">Landlord</span>
                      </div>
                      <span className="font-bold text-slate-800 truncate max-w-[150px]">{landlordName}</span>
                    </div>

                    {/* Tenant detail */}
                    <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200/50">
                      <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-bold uppercase tracking-wider text-[7px] text-slate-400 font-sans">Tenant</span>
                      </div>
                      <span className="font-bold text-slate-800 truncate max-w-[150px]">{tenantName}</span>
                    </div>

                    {/* Flat/Shop detail */}
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Ticket className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-bold uppercase tracking-wider text-[7px] text-slate-400 font-sans">
                          {propertyType === 'Shop' ? 'Shop ID' : 'Flat ID'}
                        </span>
                      </div>
                      <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[8.5px] font-mono">{flatName}</span>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5 text-left">
                    <h4 className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-200/50">
                      Transaction Breakdown
                    </h4>
                    
                    <div className="flex justify-between items-center text-[9.5px]">
                      <span className="text-slate-500 font-semibold">Monthly Rental Amount</span>
                      <span className="font-bold text-slate-750">৳{monthlyRent.toLocaleString('en-BD')}</span>
                    </div>

                    <div className="flex justify-between items-center text-[9.5px]">
                      <span className="text-slate-500 font-semibold">Total Amount Paid</span>
                      <span className="font-extrabold text-emerald-600">৳{amountPaid.toLocaleString('en-BD')}</span>
                    </div>

                    {dueAmount > 0 ? (
                      <div className="flex justify-between items-center text-[9.5px] border-t border-slate-100 pt-1.5">
                        <span className="text-amber-600 font-bold">Outstanding Balance</span>
                        <span className="font-black text-amber-600">৳{dueAmount.toLocaleString('en-BD')}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-[9.5px] border-t border-slate-100 pt-1.5">
                        <span className="text-slate-400 font-semibold">Outstanding Balance</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.5 rounded text-[7.5px] uppercase tracking-wider font-mono">৳0 Paid</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aesthetic Perforation Tear line */}
                <div className="relative my-3.5 -mx-5 h-4 flex items-center pointer-events-none select-none">
                  <div className="absolute left-0 -translate-x-1/2 w-3.5 h-3.5 bg-slate-100 dark:bg-zinc-900 rounded-full border border-slate-200/50 z-10"></div>
                  <div className="absolute right-0 translate-x-1/2 w-3.5 h-3.5 bg-slate-100 dark:bg-zinc-900 rounded-full border border-slate-200/50 z-10"></div>
                  <div className="w-full border-t border-dashed border-slate-200/80"></div>
                </div>

                {/* Bottom Secure Stamps */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/10 rounded-xl p-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[6px] text-slate-400 font-bold uppercase tracking-wider">Verification badge</span>
                        <span className="text-[8px] text-emerald-600 font-black tracking-wide uppercase">Secured & Settled</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-black text-slate-800 tracking-tight flex items-baseline justify-end gap-0.5 leading-none font-sans">
                        <span className="text-[9.5px] font-extrabold text-slate-500">৳</span>
                        <span className="font-sans font-black leading-none">{amountPaid.toLocaleString('en-BD')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clean CSS barcode blocks which always snapshot flawlessly */}
                  <div className="pt-2 border-t border-slate-100/70 flex flex-col items-center">
                    <div className="flex justify-center items-stretch h-5.5 gap-[1.5px] opacity-85 mb-1 w-full max-w-[155px]">
                      <div className="w-[1.5px] bg-slate-800 h-full"></div>
                      <div className="w-[0.8px] bg-slate-800 h-full"></div>
                      <div className="w-[3px] bg-slate-800 h-full"></div>
                      <div className="w-[1px] bg-slate-800 h-full"></div>
                      <div className="w-[4px] bg-transparent h-full"></div>
                      <div className="w-[1.5px] bg-slate-800 h-full"></div>
                      <div className="w-[1px] bg-slate-800 h-full"></div>
                      <div className="w-[2.5px] bg-slate-800 h-full"></div>
                      <div className="w-[1px] bg-slate-800 h-full"></div>
                      <div className="w-[3px] bg-slate-800 h-full"></div>
                      <div className="w-[2px] bg-transparent h-full"></div>
                      <div className="w-[1.5px] bg-slate-800 h-full"></div>
                      <div className="w-[4.2px] bg-slate-800 h-full"></div>
                      <div className="w-[1px] bg-slate-800 h-full"></div>
                      <div className="w-[2px] bg-transparent h-full"></div>
                      <div className="w-[2.5px] bg-slate-800 h-full"></div>
                      <div className="w-[1px] bg-slate-800 h-full"></div>
                      <div className="w-[2.5px] bg-slate-800 h-full"></div>
                      <div className="w-[1.5px] bg-slate-800 h-full"></div>
                    </div>
                    <span className="text-[7.5px] font-mono font-black tracking-widest text-slate-400">REF-{slipNumber}</span>
                    <p className="text-[7.5px] text-slate-400 font-extrabold mt-1">Thank you for choosing Rent Flow!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-m3-surface/90 backdrop-blur-md border-t border-m3-surface-variant/30 flex gap-3.5 shrink-0">
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
                <span className="text-xs tracking-wide">Preparing...</span>
              </span>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" /> 
                <span className="text-xs tracking-wide">Download</span>
              </>
            )}
          </button>
          <button 
            onClick={handleShare} 
            disabled={isPreparing}
            className="flex-1 flex justify-center items-center gap-2 bg-slate-150 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 font-extrabold rounded-2xl py-3 px-2 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPreparing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs tracking-wide">Preparing...</span>
              </span>
            ) : (
              <>
                <Share2 className="w-4 h-4 stroke-[2.5]" /> 
                <span className="text-xs tracking-wide">Share Receipt</span>
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

import React, { useRef, useState, useEffect } from 'react';
import { toJpeg, toBlob } from 'html-to-image';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { X, Download, Share2, ShieldCheck, User, Calendar, Landmark, Ticket } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';

export default function SlipDialog({ slipData, isOpen, onClose }: { slipData: any, isOpen: boolean, onClose: () => void }) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  const generateSlipCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const element = document.getElementById('slip-content');
    if (!element) return null;

    // To ensure the capture is complete and doesn't get clipped by parent overflow, scroll position, or
    // device borders, we clone the element and place it in a temporary off-screen container.
    const clone = element.cloneNode(true) as HTMLDivElement;
    
    // Reset height, border-radius, and shadow constraints
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.width = '325px';
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.boxShadow = 'none';
    clone.style.transform = 'none';
    clone.style.transition = 'none';
    clone.classList.remove('shadow-2xl');
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '350px';
    container.style.height = 'auto';
    container.style.overflow = 'visible';
    container.style.boxSizing = 'border-box';
    container.style.background = '#f1f5f9';
    container.style.padding = '12px';
    container.style.borderRadius = '16px';
    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      // Short delay for DOM attachment and SVG rasterization parsing
      await new Promise(resolve => setTimeout(resolve, 60));
      
      const canvas = await html2canvas(clone, {
        scale: 3, // High DPI rendering for beautiful crisper look
        useCORS: true,
        allowTaint: false, // Must be false so toBlob & toDataURL are allowed
        backgroundColor: '#ffffff',
        logging: false,
        height: clone.offsetHeight,
        windowHeight: clone.offsetHeight,
      });
      return canvas;
    } catch (err) {
      console.warn("Cloned canvas capture failed, attempting in-place fallback:", err);
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          scrollY: -window.scrollY
        });
        return canvas;
      } catch (fallbackErr) {
        console.error("Direct fallback receipt capture failed:", fallbackErr);
        return null;
      }
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };

  const handleDownload = async () => {
    try {
      setToast({ message: "⏳ Preparing your download...", type: 'success' });
      
      const canvas = await generateSlipCanvas();
      if (!canvas) {
        throw new Error("Canvas generation failed");
      }
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      if (Capacitor.isNativePlatform()) {
        const base64Data = dataUrl.split(',')[1];
        const fileName = `Slip-${slipNumber}.jpg`;
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });
        setToast({
          message: `💾 Saved to Documents as ${fileName}`,
          type: 'success'
        });
        return;
      }

      const link = document.createElement("a");
      link.download = `Slip-${slipNumber}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToast({
        message: "💾 Receipt downloaded successfully!",
        type: 'success'
      });
    } catch (error) {
      console.warn("Error downloading slip:", error);
      setToast({
        message: "Failed to download receipt image.",
        type: 'error'
      });
    }
  };

  const handleShare = async () => {
    try {
      setToast({ message: "⏳ Opening sharing options...", type: 'success' });
      
      const canvas = await generateSlipCanvas();
      if (!canvas) {
        fallbackToClipboardCopy();
        return;
      }
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = dataUrl.split(',')[1];
          const fileName = `Slip-${slipNumber}.jpg`;
          
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
        return;
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) {
        fallbackToClipboardCopy();
        return;
      }
      
      const file = new File([blob], `Slip-${slipNumber}.jpg`, { type: "image/jpeg" });
      
      if (navigator.share) {
        const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });
        
        if (canShareFiles) {
          try {
            await navigator.share({
              title: 'Rent Flow Payment Slip',
              text: `Payment receipt from Rent Flow. ৳${amountPaid} paid by ${tenantName} for ${billingMonth} ${billingYear}.`,
              files: [file],
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
          try {
            await navigator.share({
              title: 'Rent Flow Payment Slip',
              text: `Rent Flow Receipt\nSlip No: ${slipNumber}\nLandlord: ${landlordName}\nTenant: ${tenantName}\nProperty: ${flatName}\nPeriod: ${billingMonth} ${billingYear}\nAmount: ৳${amountPaid.toLocaleString('en-BD')}\nStatus: ${paymentStatus}`,
            });
          } catch (textError: any) {
            const txtErrorMsg = textError.message?.toLowerCase() || '';
            if (textError.name === 'AbortError' || txtErrorMsg.includes('cancel') || txtErrorMsg.includes('abort')) {
              console.log("Text share canceled.");
            } else {
              fallbackToClipboardCopy();
            }
          }
        }
      } else {
        fallbackToClipboardCopy();
      }
    } catch (error) {
       console.warn("Share routine error:", error);
       fallbackToClipboardCopy();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-m3-surface rounded-3xl w-full max-w-sm max-h-[90vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-m3-surface-variant/20 shrink-0">
          <h2 className="text-base font-extrabold tracking-tight text-m3-on-surface">Payment Slip</h2>
          <button onClick={onClose} className="p-1.5 text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Scrollable Body container to support full visibility of height-restricted screens */}
        <div className="p-4 bg-slate-100/95 dark:bg-zinc-950/70 overflow-y-auto w-full flex-1">
          <div className="flex items-center justify-center py-2 w-full min-h-min">
            {/* Slip Render Area - Designed elegantly, avoiding clipping */}
            <div ref={slipRef} id="slip-content" className="bg-white text-slate-800 w-full max-w-[325px] p-5 shadow-2xl border border-slate-100 flex flex-col relative shrink-0 rounded-2xl overflow-hidden font-sans">
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
                <Logo className="w-8 h-8 shrink-0" />
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
            className="flex-1 flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-2xl py-3 px-3 shadow-md active:scale-[0.98] transition-all duration-200"
          >
            <Download className="w-4 h-4 stroke-[2.5]" /> 
            <span className="text-[13px] tracking-wide">Download</span>
          </button>
          <button 
            onClick={handleShare} 
            className="flex-1 flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 font-extrabold rounded-2xl py-3 px-3 active:scale-[0.98] transition-all duration-200"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" /> 
            <span className="text-[13px] tracking-wide">Share Receipt</span>
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

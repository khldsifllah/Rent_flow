import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { X, Download, Share2 } from 'lucide-react';
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

  // Extract variables with reliable fallback structures
  const landlordName = slipData.landlordName || slipData.owner_name || 'N/A';
  const tenantName = slipData.tenantName || slipData.tenant_name || 'N/A';
  const flatName = slipData.flatName || slipData.flat_name || 'N/A';
  
  const amountPaid = slipData.amountPaid !== undefined 
    ? Number(slipData.amountPaid) 
    : (Number(slipData.total_amount) || 0);

  const billingMonth = slipData.billingMonth || slipData.month || '';
  const billingYear = slipData.billingYear || slipData.year || '';
  const periodText = [billingMonth, billingYear].filter(Boolean).join(' ');

  const rawSlipNo = slipData.slipNumber || slipData.slip_number || 'N/A';
  const displaySlipNumber = rawSlipNo.startsWith('RF-') ? rawSlipNo : `RF-${rawSlipNo}`;

  // Process payment date Paid with date-fns format
  let formattedDatePaid = 'N/A';
  try {
    const rawDate = slipData.datePaid || slipData.date;
    if (rawDate) {
      if (typeof rawDate === 'number') {
        formattedDatePaid = format(new Date(rawDate), 'dd MMM yyyy');
      } else if (typeof rawDate === 'string') {
        if (rawDate.includes('/') || (rawDate.includes('-') && rawDate.length < 15)) {
          formattedDatePaid = rawDate; 
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

  // Text representation for Clipboard backup
  const fallbackToClipboardCopy = async () => {
    try {
      const receiptText = `----------------------------------
RENT FLOW - PAYMENT RECEIPT
----------------------------------
Slip No: ${displaySlipNumber}
Status: CLEARED ✅
----------------------------------
Landlord: ${landlordName}
Tenant: ${tenantName}
Flat/Shop: ${flatName}
Month: ${periodText}
Paid On: ${formattedDatePaid}
----------------------------------
Amount: ৳${amountPaid.toLocaleString('en-BD')}
----------------------------------
Thank you for using Rent Flow`;

      await navigator.clipboard.writeText(receiptText);
      setToast({
        message: "📋 Receipt text copied to clipboard! You can paste and share it.",
        type: 'success'
      });
    } catch (err) {
      console.log("Clipboard fallback failed", err);
      setToast({
        message: "Sharing failed. Please capture a screenshot.",
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

  // Perform html2canvas rendering perfectly on our high-contrast, text-only element
  const renderSlipCanvas = async (): Promise<string | null> => {
    const element = document.getElementById('slip-content');
    if (!element) return null;
    
    try {
      const renderedCanvas = await html2canvas(element, {
        scale: 2.5, // Crisp high fidelity DPI representation
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        scrollX: 0,
        scrollY: 0
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
      setToast({ message: "⏳ Saving high-quality JPG receipt...", type: 'success' });
      
      const dataUrl = await renderSlipCanvas();
      if (!dataUrl) {
        throw new Error("Unable to capture receipt area");
      }
      
      if (Capacitor.isNativePlatform()) {
        const base64Data = dataUrl.split(',')[1];
        const fileName = `RentFlow-Slip-${rawSlipNo}.jpg`;
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

      // Standard desktop/mobile browser anchor click download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `RentFlow-Slip-${rawSlipNo}.jpg`;
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
        message: "Download failed. Copied receipt text to clipboard instead.",
        type: 'error'
      });
      fallbackToClipboardCopy();
    } finally {
      setIsPreparing(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsPreparing(true);
      setToast({ message: "⏳ Generating share snapshot...", type: 'success' });
      
      const dataUrl = await renderSlipCanvas();
      if (!dataUrl) {
        fallbackToClipboardCopy();
        return;
      }
      
      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = dataUrl.split(',')[1];
          const fileName = `RentFlow-Slip-${rawSlipNo}.jpg`;
          
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });
          
          await Share.share({
            title: 'Rent Flow Receipt',
            text: `Rent Flow Slip RF-${rawSlipNo} Cleared!`,
            url: writeResult.uri,
            dialogTitle: 'Share Receipt',
          });
        } catch (nativeError: any) {
          console.warn("Native share error, using copy fallback:", nativeError);
          fallbackToClipboardCopy();
        }
        return;
      }

      // Check support for navigator.share with files
      const blob = dataURLtoBlob(dataUrl);
      const file = new File([blob], `RentFlow-Slip-${rawSlipNo}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Rent Flow Payment Receipt',
            text: `Official Rent Flow Payment Receipt - Slip #${displaySlipNumber}`,
            files: [file]
          });
        } catch (shareError: any) {
          const errorMsg = shareError.message?.toLowerCase() || '';
          if (shareError.name === 'AbortError' || errorMsg.includes('cancel') || errorMsg.includes('abort')) {
            console.log("Web sharing cancelled by user.");
          } else {
            console.warn("File sharing failed, trying text sharing:", shareError);
            try {
              await navigator.share({
                title: 'Rent Flow Payment Slip',
                text: `Rent Flow Receipt\nSlip No: ${displaySlipNumber}\nLandlord: ${landlordName}\nTenant: ${tenantName}\nFlat/Shop: ${flatName}\nMonth: ${periodText}\nAmount: ৳${amountPaid.toLocaleString('en-BD')}\nStatus: CLEARED ✅`,
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
       console.warn("Share fallback initiated:", error);
       fallbackToClipboardCopy();
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3 backdrop-blur-xs font-sans">
      <div className="bg-m3-surface text-m3-on-surface rounded-2xl w-full max-w-[340px] flex flex-col shadow-xl overflow-hidden max-h-[96vh] animate-in fade-in zoom-in-95 duration-100 border border-m3-surface-variant/40">
        
        {/* Header (Modal Control) */}
        <div className="flex justify-between items-center px-4 py-3.5 border-b border-m3-surface-variant/50 shrink-0 bg-m3-surface">
          <span className="text-xs font-bold text-m3-on-surface tracking-wide uppercase">পরিশোধের রসিদ (Payment Slip)</span>
          <button onClick={onClose} className="p-1 text-m3-on-surface-variant hover:text-m3-on-surface rounded-full hover:bg-m3-surface-variant transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compact Center Scrollless Wrapper */}
        <div className="p-4 bg-m3-background/45 flex-1 flex flex-col items-center justify-center overflow-visible">
          
          {/* Capturable Redesigned Slip Area - Clean black-and-white print-ready local format */}
          <div 
            ref={slipRef} 
            id="slip-content" 
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              width: '290px',
              padding: '24px 20px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '8px',
              border: '2px solid #000000',
              height: 'auto',
              overflow: 'visible',
              boxShadow: 'none'
            }}
          >
            
            {/* TOP HEADER */}
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px dashed #000000', paddingBottom: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#000000', letterSpacing: '-0.04em', lineHeight: '1' }}>
                Rent Flow
              </div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#000000', marginTop: '4px', fontStyle: 'normal' }}>
                টাকা প্রাপ্তি রসিদ
              </div>
              <div style={{ fontSize: '7.5px', fontWeight: '700', color: '#555555', letterSpacing: '0.08em', marginTop: '2px', textTransform: 'uppercase' }}>
                Official Rental Receipt
              </div>
            </div>

            {/* MIDDLE INFO BOX ROWS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* Slip Number */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '5px', borderBottom: '1px dotted #000000' }}>
                <span style={{ color: '#444444', fontSize: '10px', fontWeight: '700' }}>রসিদ নং (Slip No):</span>
                <span style={{ color: '#000000', fontSize: '11px', fontWeight: '800', fontFamily: 'monospace' }}>{displaySlipNumber}</span>
              </div>

              {/* Date Paid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '5px', borderBottom: '1px dotted #000000' }}>
                <span style={{ color: '#444444', fontSize: '10px', fontWeight: '700' }}>তারিখ (Date):</span>
                <span style={{ color: '#000000', fontSize: '11px', fontWeight: '700' }}>{formattedDatePaid}</span>
              </div>

              {/* Landlord Name */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '5px', borderBottom: '1px dotted #000000' }}>
                <span style={{ color: '#444444', fontSize: '10px', fontWeight: '700' }}>বাড়িওয়ালা (Owner):</span>
                <span style={{ color: '#000000', fontSize: '11px', fontWeight: '700', maxWidth: '160px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{landlordName}</span>
              </div>

              {/* Tenant Name */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '5px', borderBottom: '1px dotted #000000' }}>
                <span style={{ color: '#444444', fontSize: '10px', fontWeight: '700' }}>ভাড়াটিয়া (Tenant):</span>
                <span style={{ color: '#000000', fontSize: '11px', fontWeight: '700', maxWidth: '160px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenantName}</span>
              </div>

              {/* Flat or Shop Name */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '5px', borderBottom: '1px dotted #000000' }}>
                <span style={{ color: '#444444', fontSize: '10px', fontWeight: '700' }}>ফ্ল্যাট/দোকান (Unit):</span>
                <span style={{ color: '#000000', fontSize: '11px', fontWeight: '800', fontFamily: 'monospace' }}>{flatName}</span>
              </div>

              {/* Month & Year */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '5px', borderBottom: '1px dotted #000000' }}>
                <span style={{ color: '#444444', fontSize: '10px', fontWeight: '700' }}>ভাড়ার মাস (Month):</span>
                <span style={{ color: '#000000', fontSize: '11px', fontWeight: '700' }}>{periodText}</span>
              </div>

              {/* Amount Cleared */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '5px', borderBottom: '1.5px solid #000000' }}>
                <span style={{ color: '#000000', fontSize: '10.5px', fontWeight: '800' }}>টাকার পরিমাণ (Amount):</span>
                <span style={{ color: '#000000', fontSize: '14px', fontWeight: '900' }}>৳{amountPaid.toLocaleString('en-BD')}</span>
              </div>

              {/* Status CLEARED Green Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                <span style={{ color: '#444444', fontSize: '10.5px', fontWeight: '700' }}>অবস্থা (Status):</span>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  color: '#386a20',
                  border: '1.5px solid #386a20',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  fontSize: '10.5px',
                  fontWeight: '900',
                  letterSpacing: '0.04em'
                }}>
                  পরিশোধিত (PAID)
                </div>
              </div>

            </div>

            {/* BOTTOM THANK YOU FOOTER TEXT */}
            <div style={{ 
              textAlign: 'center', 
              fontSize: '9px', 
              color: '#333333', 
              marginTop: '20px', 
              fontWeight: '700', 
              borderTop: '2px solid #000000', 
              paddingTop: '8px'
            }}>
              রেন্ট ফ্লো ব্যবহারের জন্য ধন্যবাদ
            </div>

          </div>

        </div>

        {/* Operational Footer Actions using M3 theme properties */}
        <div className="p-3.5 bg-m3-surface border-t border-m3-surface-variant/40 flex gap-3 shrink-0">
          <button 
            onClick={handleDownload} 
            disabled={isPreparing}
            className="flex-1 flex justify-center items-center gap-1.5 bg-m3-primary text-m3-on-primary font-bold rounded-xl py-2.5 px-3 shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 text-[12.5px]"
          >
            <Download className="w-4 h-4 text-m3-on-primary" /> 
            <span>ডাউনলোড (Save)</span>
          </button>
          
          <button 
            onClick={handleShare} 
            disabled={isPreparing}
            className="flex-1 flex justify-center items-center gap-1.5 bg-m3-surface-variant text-m3-on-surface-variant font-bold rounded-xl py-2.5 px-3 active:scale-[0.98] transition-all disabled:opacity-50 text-[12.5px]"
          >
            <Share2 className="w-4 h-4 text-m3-on-surface-variant" /> 
            <span>শেয়ার (Share)</span>
          </button>
        </div>
      </div>

      {/* Elegant minimalist notification toast bar */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120] w-[90%] max-w-xs font-sans pointer-events-none"
          >
            <div className={`px-4 py-2.5 rounded-xl shadow-lg text-[11.5px] font-bold flex items-center justify-between gap-2 border backdrop-blur-md pointer-events-auto ${
              toast.type === 'error'
                ? 'bg-red-500/90 text-white border-red-500/40'
                : 'bg-emerald-500/90 text-white border-emerald-500/40'
            }`}>
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="p-0.5 rounded hover:bg-white/10 text-white/80 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

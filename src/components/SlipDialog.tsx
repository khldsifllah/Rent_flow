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
        scale: 2, // High resolution fallback output
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        foreignObjectRendering: false,
        imageTimeout: 10000,
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
      <div className="bg-white rounded-2xl w-full max-w-[340px] flex flex-col shadow-2xl overflow-hidden max-h-[96vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header (Modal Control) */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-100 shrink-0">
          <span className="text-sm font-black text-slate-800 tracking-wide uppercase">Rent Flow Receipt</span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-900 rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compact Center Scrollless Wrapper */}
        <div className="p-3 bg-neutral-50 flex-1 flex flex-col items-center justify-center overflow-visible">
          
          {/* Capturable Redesigned Slip Area - Perfect inline style layout, white background, no external fonts/images */}
          <div 
            ref={slipRef} 
            id="slip-content" 
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              width: '310px',
              padding: '20px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '12px',
              border: '1px solid #e1e8ed',
              height: 'auto',
              overflow: 'visible',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
            }}
          >
            
            {/* TOP HEADER */}
            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #000000', paddingBottom: '10px' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#000000', letterSpacing: '-0.04em', lineHeight: '1', fontFamily: 'sans-serif' }}>
                Rent Flow
              </div>
              <div style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', letterSpacing: '0.15em', marginTop: '4px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                OFFICIAL PAYMENT RECEIPT
              </div>
            </div>

            {/* MIDDLE INFO BOX ROWS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* Slip Number */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>SLIP NO:</span>
                <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: '800', fontFamily: 'monospace' }}>{displaySlipNumber}</span>
              </div>

              {/* Date Paid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>DATE PAID:</span>
                <span style={{ color: '#0f172a', fontSize: '11px', fontWeight: '700' }}>{formattedDatePaid}</span>
              </div>

              {/* Landlord Name */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>LANDLORD:</span>
                <span style={{ color: '#0f172a', fontSize: '11px', fontWeight: '700', maxWidth: '180px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{landlordName}</span>
              </div>

              {/* Tenant Name */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>TENANT:</span>
                <span style={{ color: '#0f172a', fontSize: '11px', fontWeight: '700', maxWidth: '180px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenantName}</span>
              </div>

              {/* Flat or Shop Name */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>FLAT/SHOP:</span>
                <span style={{ color: '#0f172a', fontSize: '11px', fontWeight: '800', fontFamily: 'monospace' }}>{flatName}</span>
              </div>

              {/* Month & Year */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>MONTH:</span>
                <span style={{ color: '#0f172a', fontSize: '11px', fontWeight: '700' }}>{periodText}</span>
              </div>

              {/* Amount Cleared */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>AMOUNT:</span>
                <span style={{ color: '#0f172a', fontSize: '14px', fontWeight: '900', fontFamily: 'sans-serif' }}>৳{amountPaid.toLocaleString('en-BD')}</span>
              </div>

              {/* Status CLEARED Green Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>STATUS:</span>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #10b981',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '0.05em'
                }}>
                  CLEARED
                </div>
              </div>

            </div>

            {/* BOTTOM THANK YOU FOOTER TEXT */}
            <div style={{ 
              textAlign: 'center', 
              fontSize: '9px', 
              color: '#64748b', 
              marginTop: '18px', 
              fontWeight: '600', 
              borderTop: '1px solid #e2e8f0', 
              paddingTop: '10px',
              fontStyle: 'italic'
            }}>
              Thank you for using Rent Flow
            </div>

          </div>

        </div>

        {/* Operational Footer Actions */}
        <div className="p-3.5 bg-neutral-100/90 border-t border-neutral-200 flex gap-3 shrink-0">
          <button 
            onClick={handleDownload} 
            disabled={isPreparing}
            className="flex-1 flex justify-center items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-2.5 px-3 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 text-[12.5px]"
          >
            <Download className="w-4 h-4 text-white" /> 
            <span>Download JPG</span>
          </button>
          
          <button 
            onClick={handleShare} 
            disabled={isPreparing}
            className="flex-1 flex justify-center items-center gap-1.5 bg-slate-200 hover:bg-slate-350 text-slate-800 font-bold rounded-xl py-2.5 px-3 active:scale-[0.98] transition-all disabled:opacity-50 text-[12.5px]"
          >
            <Share2 className="w-4 h-4 text-slate-700" /> 
            <span>Share Slip</span>
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

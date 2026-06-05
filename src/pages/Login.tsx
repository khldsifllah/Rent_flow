import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Logo from '../components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const showMessage = (message: string, type: 'success' | 'error') => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => {
      setSnackbar(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleSendOtp = async (isResend = false) => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      showMessage('Please enter an email address', 'error');
      return;
    }
    
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      showMessage('Please enter a valid email address', 'error');
      return;
    }

    setIsSending(true);
    
    try {
      const res = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: true },
      });

      if (res.error) {
        showMessage(res.error.message, 'error');
      } else {
        if (!isResend) {
          setStep(2);
        }
        setCountdown(30);
        showMessage('OTP sent! Check your email', 'success');
        // Clear OTP when sending new one
        setOtpValues(Array(6).fill(''));
        setTimeout(() => {
           inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (err: any) {
      console.error('Send OTP Error:', err);
      showMessage(err.message || 'An unexpected error occurred', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const fullOtp = otpValues.join('').trim();
    
    if (fullOtp.length < 6) {
      showMessage('Please enter the full 6-digit OTP', 'error');
      return;
    }

    setIsVerifying(true);
    
    try {
      const res = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: fullOtp,
        type: 'email',
      });

      if (res.error) {
        showMessage('Invalid OTP', 'error');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Verify OTP Error:', err);
      showMessage(err.message || 'An unexpected error occurred', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pastedData = value.replace(/[^0-9]/g, '').slice(0, 6).split('');
      const newOtpValues = [...otpValues];
      pastedData.forEach((char, i) => {
         if (index + i < 6) newOtpValues[index + i] = char;
      });
      setOtpValues(newOtpValues);
      const lastFilledIndex = Math.min(index + pastedData.length, 5);
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    const val = value.replace(/[^0-9]/g, '');
    const newOtpValues = [...otpValues];
    newOtpValues[index] = val;
    setOtpValues(newOtpValues);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      if (otpValues.every(v => v !== '')) {
        handleVerifyOtp();
      }
    }
  };

  const isOtpValid = otpValues.every(v => v !== '');

  const fadeVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: 'easeIn' } }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090E] p-6 font-sans relative overflow-hidden text-white selection:bg-m3-primary/30">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-m3-primary/10 blur-[120px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 blur-[130px] rounded-full pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

      <div className="w-full max-w-[420px] relative z-10 flex flex-col">
        
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center w-full bg-m3-surface-variant/10 backdrop-blur-3xl p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl ring-1 ring-black/5"
            >
              {/* Cancel Button */}
              <button 
                onClick={() => navigate('/')}
                className="self-start p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
                aria-label="Cancel"
              >
                <ArrowLeft className="w-5 h-5" />
                Cancel
              </button>

              {/* Logo & Title */}
              <div className="flex flex-col items-center mb-10 -mt-2">
                <div className="bg-m3-surface-variant/20 p-4 rounded-3xl mb-6 shadow-2xl border border-white/5 relative group">
                  <div className="absolute inset-0 bg-m3-primary/20 rounded-3xl blur-xl group-hover:bg-m3-primary/30 transition-colors pointer-events-none" />
                  <Logo className="w-16 h-16 drop-shadow-xl relative z-10" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Rent Flow</h1>
                <p className="text-gray-400 text-sm font-medium tracking-wide">Smart Rent Management</p>
              </div>

              {/* Email Input */}
              <div className="w-full mb-6 relative">
                <div className="relative group">
                  <input 
                    type="email" 
                    id="email_input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    className="block px-4 pb-2.5 pt-5 w-full text-base text-white bg-black/20 rounded-2xl border-2 border-white/10 appearance-none focus:outline-none focus:ring-0 focus:border-m3-primary peer transition-colors backdrop-blur-sm shadow-inner" 
                    placeholder=" " 
                  />
                  <label 
                    htmlFor="email_input" 
                    className="absolute text-base text-gray-400 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] bg-[#0c0f16] px-2 rounded-md peer-focus:px-2 peer-focus:text-m3-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-4 peer-focus:scale-75 peer-focus:-translate-y-4 left-3 flex items-center gap-1.5 cursor-text"
                  >
                    <Mail className="w-4 h-4" />
                    Email address
                  </label>
                </div>
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendOtp(false)}
                disabled={isSending}
                className="w-full h-[56px] flex items-center justify-center rounded-2xl bg-m3-primary hover:bg-m3-primary/90 px-6 text-[15px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-m3-primary/20 mb-8 overflow-hidden relative"
              >
                {isSending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Sending...
                  </span>
                ) : 'Continue with Email'}
              </button>

              <p className="text-[13px] text-gray-400 text-center leading-relaxed">
                We'll send a secure 6-digit<br/>verification code to your email
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col w-full bg-m3-surface-variant/10 backdrop-blur-3xl p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl ring-1 ring-black/5"
            >
              {/* Back Button */}
              <button 
                onClick={() => setStep(1)}
                className="self-start p-2 -ml-2 mb-6 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>

              {/* Title & Description */}
              <div className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Check your email</h2>
                <p className="text-gray-400 text-[15px] leading-relaxed">
                  We sent a verification code to<br/>
                  <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              {/* OTP Inputs */}
              <div className="grid grid-cols-6 gap-2 sm:gap-3 mb-10 w-full">
                {otpValues.map((value, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-full h-12 sm:h-14 text-center text-xl sm:text-2xl font-bold text-white bg-black/20 border-2 border-white/10 rounded-2xl focus:border-m3-primary focus:outline-none focus:bg-m3-primary/10 transition-all selection:bg-transparent shadow-inner"
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!isOtpValid || isVerifying}
                className="w-full h-[56px] flex items-center justify-center rounded-2xl bg-m3-primary hover:bg-m3-primary/90 px-6 text-[15px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-m3-primary/20 mb-6"
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Verifying...
                  </span>
                ) : 'Secure Login'}
              </button>

              {/* Resend OTP */}
              <div className="text-center">
                <button
                  type="button"
                  disabled={countdown > 0 || isSending}
                  onClick={() => handleSendOtp(true)}
                  className="text-sm font-medium text-m3-primary hover:text-m3-primary/80 disabled:text-gray-500 disabled:pointer-events-none transition-colors"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Snackbar */}
      <AnimatePresence>
        {snackbar.show && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 min-w-[320px] max-w-[400px] z-50 text-white"
          >
            <div className={`px-5 py-4 rounded-2xl shadow-2xl text-[14px] font-medium flex items-center justify-between border backdrop-blur-md ${
              snackbar.type === 'error' 
                ? 'bg-red-500/10 text-red-100 border-red-500/20 shadow-red-500/10' 
                : 'bg-green-500/10 text-green-100 border-green-500/20 shadow-green-500/10'
            }`}>
              <span className="flex-1 drop-shadow-sm">{snackbar.message}</span>
              <button 
                onClick={() => setSnackbar(prev => ({ ...prev, show: false }))}
                className={`ml-4 p-1.5 rounded-xl opacity-70 hover:opacity-100 transition-colors ${
                  snackbar.type === 'error' ? 'hover:bg-red-500/20' : 'hover:bg-green-500/20'
                }`}
              >
                <svg className="w-5 h-5" fill="none" strokeWidth="2.5" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import TenantProfile from './pages/TenantProfile';
import Admin from './pages/Admin';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function ProtectedRoutes({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-m3-surface">
        <div className="w-12 h-12 border-4 border-m3-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Light }).catch(console.error);
      StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(console.error);
      StatusBar.setOverlaysWebView({ overlay: false }).catch(console.error);
    }

    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check just in case
    if (navigator.onLine) {
      // confirm connection with quick silent health check
      fetch('/api/health', { method: 'HEAD', cache: 'no-store' })
        .then(() => setIsOffline(false))
        .catch(() => {
          // If the API call fails, double check public CDN to verify actual internet status
          fetch('https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.400.0/umd/lucide-react.min.js', { method: 'HEAD', mode: 'no-cors' })
            .then(() => setIsOffline(false))
            .catch(() => setIsOffline(true));
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Simulate slight delay for excellent visual feedback
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Check navigator.onLine first
    if (!navigator.onLine) {
      setIsOffline(true);
      setIsRetrying(false);
      return;
    }

    // Attempt real handshake fetch to verify active internet transport
    try {
      const response = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' }).catch(() => null);
      if (response && response.ok) {
        setIsOffline(false);
      } else {
        const publicCheck = await fetch('https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.400.0/umd/lucide-react.min.js', { method: 'HEAD', mode: 'no-cors' }).catch(() => null);
        if (publicCheck) {
          setIsOffline(false);
        } else {
          setIsOffline(true);
        }
      }
    } catch {
      setIsOffline(true);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOffline ? (
        <motion.div
          key="offline-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen flex flex-col items-center justify-center bg-m3-background text-m3-on-background px-6 py-12 transition-colors duration-300 select-none"
        >
          <div className="flex flex-col items-center max-w-sm text-center">
            {/* Pulsing WiFi-Off Icon Container styled with beautiful M3 elevation and roundness */}
            <div className="relative mb-8 p-6 bg-m3-surface-variant text-m3-primary rounded-[2rem] shadow-md flex items-center justify-center">
              <span className="absolute inset-0 rounded-[2rem] bg-m3-primary/10 animate-ping opacity-60"></span>
              <WifiOff className="w-16 h-16 relative z-10" />
            </div>

            {/* Typography paired beautifully */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
              You're Offline
            </h1>
            
            <p className="text-sm text-m3-on-surface-variant font-medium leading-relaxed mb-8">
              Please check your internet connection and try again.
            </p>

            {/* Pill-shaped Retry Button with feedback loader */}
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center justify-center gap-2.5 bg-m3-primary text-m3-on-primary hover:bg-opacity-90 disabled:bg-m3-secondary shadow-lg disabled:shadow-none px-8 py-3.5 rounded-full font-extrabold text-sm uppercase tracking-wider transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed border border-transparent"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Checking...' : 'Retry'}</span>
            </button>
          </div>
        </motion.div>
      ) : (
        <div key="online-app" className="contents">
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoutes>
                      <Layout />
                    </ProtectedRoutes>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="tenants" element={<Tenants />} />
                  <Route path="tenants/:id" element={<TenantProfile />} />
                  <Route path="admin" element={<Admin />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </div>
      )}
    </AnimatePresence>
  );
}


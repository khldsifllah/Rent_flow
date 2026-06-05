import { useEffect } from 'react';
import { supabase } from '../supabase';

export default function AuthCallback() {
  useEffect(() => {
    const handleAuth = async () => {
      // Supabase automatically processes the URL hash and saves the session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
      }

      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
        window.close();
      } else {
        window.location.replace('/');
      }
    };

    // Listen for the auth state change which happens when Supabase parses the URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        handleAuth();
      }
    });

    // Fallback in case the event already fired or we just need to check
    const timer = setTimeout(handleAuth, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-[#1a237e] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600 font-medium">Completing login...</p>
    </div>
  );
}

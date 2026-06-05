import { supabase } from './supabase';
async function test() {
  console.log("Testing signInWithOtp directly...");
  const res = await supabase.auth.signInWithOtp({
    email: "test_otp_" + Date.now() + "@example.com",
    options: {
      shouldCreateUser: true,
    }
  });
  console.log("Response:", JSON.stringify(res, null, 2));
}
test();

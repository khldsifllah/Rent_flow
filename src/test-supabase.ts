import { supabase } from './supabase';
async function test() {
  console.log("Testing SignUp directly to see if trigger fails...");
  const res = await supabase.auth.signUp({
    email: "test_db_trigger_" + Date.now() + "@example.com",
    password: "TestPassword123!"
  });
  console.log("Response:", JSON.stringify(res, null, 2));
}
test();

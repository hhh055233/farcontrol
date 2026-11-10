import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";

import { createClient } from "@supabase/supabase-js";

// Publishable values are designed to be included in mobile clients.
// No service-role or secret key is stored in this app.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://gjopwszrjdcxhtflhbkj.supabase.co";
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_tr5FzKUMed8SPLkClIfUiA_dG8PIOUD";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

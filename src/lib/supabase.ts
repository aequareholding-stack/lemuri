import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const schluessel = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** Wahr, sobald .env die Verbindungsdaten enthält (siehe .env.example). */
export const supabaseKonfiguriert = url.startsWith('https://') && schluessel.length > 0;

export const supabase = createClient(
  supabaseKonfiguriert ? url : 'https://nicht-konfiguriert.invalid',
  supabaseKonfiguriert ? schluessel : 'nicht-konfiguriert',
  {
    auth: {
      // Im Browser nutzt supabase-js localStorage, auf dem Handy AsyncStorage.
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);

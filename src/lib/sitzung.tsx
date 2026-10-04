import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseKonfiguriert } from './supabase';
import type { Rolle } from './anmeldung';

type SitzungStand = {
  laedt: boolean;
  sitzung: Session | null;
  rolle: Rolle | null;
};

const SitzungContext = createContext<SitzungStand>({ laedt: true, sitzung: null, rolle: null });

function rolleAus(sitzung: Session | null): Rolle | null {
  if (!sitzung) return null;
  const meta = sitzung.user.user_metadata as { rolle?: string } | undefined;
  return meta?.rolle === 'kind' ? 'kind' : 'eltern';
}

export function SitzungProvider({ children }: { children: React.ReactNode }) {
  const [stand, setStand] = useState<SitzungStand>({ laedt: supabaseKonfiguriert, sitzung: null, rolle: null });

  useEffect(() => {
    if (!supabaseKonfiguriert) return;
    supabase.auth.getSession().then(({ data }) => {
      setStand({ laedt: false, sitzung: data.session, rolle: rolleAus(data.session) });
    });
    const { data: abo } = supabase.auth.onAuthStateChange((_ereignis, sitzung) => {
      setStand({ laedt: false, sitzung, rolle: rolleAus(sitzung) });
    });
    return () => abo.subscription.unsubscribe();
  }, []);

  return <SitzungContext.Provider value={stand}>{children}</SitzungContext.Provider>;
}

export function useSitzung(): SitzungStand {
  return useContext(SitzungContext);
}

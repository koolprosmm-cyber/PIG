'use client';

import { useSession } from '@clerk/nextjs';
import { useMemo } from 'react';
import { createClerkSupabaseClient } from '@/lib/supabase/client';

export function useSupabase() {
  const { session } = useSession();
  return useMemo(
    () => createClerkSupabaseClient(
      async () => (await session?.getToken({ template: 'supabase' })) ?? null
    ),
    [session]
  );
}

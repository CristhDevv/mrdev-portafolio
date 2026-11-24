import { useEffect } from 'react';
import { getOpsSupabaseClient } from '../services/supabaseClient';

export function useOpsRealtime(enabled: boolean, onRefresh: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const supabase = getOpsSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel('ops-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_machines' }, onRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_agents' }, onRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_tasks' }, onRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_approval_requests' }, onRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ops_activity_events' }, onRefresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, onRefresh]);
}

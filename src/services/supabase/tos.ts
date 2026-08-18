import { supabase } from './config';

export interface TosVersion {
  id: string;
  version: string;
  title: string;
  content_html: string;
  effective_date: string;
}

export async function checkTosAccepted(userRole: string, userIdentifier: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_tos_accepted', {
    p_user_role: userRole,
    p_user_identifier: userIdentifier,
  });

  if (error) {
    console.error('Error checking ToS acceptance:', error);
    return false;
  }

  return data === true;
}

export async function recordTosAcceptance(userRole: string, userIdentifier: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('record_tos_acceptance', {
    p_user_role: userRole,
    p_user_identifier: userIdentifier,
    p_user_agent: navigator.userAgent,
  });

  if (error) {
    console.error('Error recording ToS acceptance:', error);
    return false;
  }

  return data?.success === true;
}

export async function getCurrentTos(): Promise<TosVersion | null> {
  const { data, error } = await supabase.rpc('get_current_tos');

  if (error || !data || !data.id) {
    console.error('Error fetching current ToS:', error);
    return null;
  }

  return data as TosVersion;
}

export async function getTosAcceptanceStats(): Promise<{
  total_acceptances: number;
  by_role: Record<string, number>;
  version: string;
  effective_date: string;
} | null> {
  const { data, error } = await supabase.rpc('get_tos_acceptance_stats');

  if (error) {
    console.error('Error fetching ToS stats:', error);
    return null;
  }

  return data;
}

export async function getTosAcceptanceRecords(): Promise<Array<{
  id: string;
  user_role: string;
  user_identifier: string;
  accepted_at: string;
}>> {
  const { data, error } = await supabase
    .from('tos_acceptances')
    .select('id, user_role, user_identifier, accepted_at')
    .order('accepted_at', { ascending: false });

  if (error) {
    console.error('Error fetching ToS acceptance records:', error);
    return [];
  }

  return data || [];
}

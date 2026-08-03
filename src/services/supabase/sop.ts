import { supabase } from './config';

export interface SopFlow {
  id: string;
  slug: string;
  title: string;
  description: string;
  role: string;
  order_index: number;
  published: boolean;
}

export interface SopStep {
  id: string;
  flow_id: string;
  order_index: number;
  title: string;
  body: string;
  target_route: string | null;
  target_selector: string | null;
  screenshot_url: string | null;
  screenshot_caption: string | null;
  tip: string | null;
}

export async function listFlows(): Promise<SopFlow[]> {
  const { data, error } = await supabase
    .from('sop_flows')
    .select('*')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data || []) as SopFlow[];
}

export async function listSteps(flowId: string): Promise<SopStep[]> {
  const { data, error } = await supabase
    .from('sop_steps')
    .select('*')
    .eq('flow_id', flowId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data || []) as SopStep[];
}

export async function createFlow(input: Partial<SopFlow> & { slug: string; title: string }): Promise<SopFlow> {
  const { data, error } = await supabase
    .from('sop_flows')
    .insert({
      slug: input.slug,
      title: input.title,
      description: input.description || '',
      role: input.role || 'all',
      order_index: input.order_index ?? 0,
      published: input.published ?? true,
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as SopFlow;
}

export async function updateFlow(id: string, patch: Partial<SopFlow>): Promise<void> {
  const { error } = await supabase
    .from('sop_flows')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFlow(id: string): Promise<void> {
  const { error } = await supabase.from('sop_flows').delete().eq('id', id);
  if (error) throw error;
}

export async function createStep(input: Partial<SopStep> & { flow_id: string; title: string }): Promise<SopStep> {
  const { data, error } = await supabase
    .from('sop_steps')
    .insert({
      flow_id: input.flow_id,
      order_index: input.order_index ?? 0,
      title: input.title,
      body: input.body || '',
      target_route: input.target_route || '',
      target_selector: input.target_selector || '',
      screenshot_url: input.screenshot_url || '',
      screenshot_caption: input.screenshot_caption || '',
      tip: input.tip || '',
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as SopStep;
}

export async function updateStep(id: string, patch: Partial<SopStep>): Promise<void> {
  const { error } = await supabase
    .from('sop_steps')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteStep(id: string): Promise<void> {
  const { error } = await supabase.from('sop_steps').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadScreenshot(file: Blob, filename: string): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}_${safeName}`;
  const { error } = await supabase.storage
    .from('sop-screenshots')
    .upload(path, file, { contentType: file.type || 'image/png', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('sop-screenshots').getPublicUrl(path);
  return data.publicUrl;
}

export async function recordProgress(userKey: string, userRole: string, flowId: string, stepId: string): Promise<void> {
  await supabase
    .from('sop_progress')
    .upsert(
      {
        user_key: userKey,
        user_role: userRole,
        flow_id: flowId,
        step_id: stepId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_key,step_id' }
    );
}

export async function getProgress(userKey: string): Promise<Record<string, Set<string>>> {
  if (!userKey) return {};
  const { data, error } = await supabase
    .from('sop_progress')
    .select('flow_id, step_id')
    .eq('user_key', userKey);
  if (error) throw error;
  const map: Record<string, Set<string>> = {};
  for (const row of data || []) {
    if (!map[row.flow_id]) map[row.flow_id] = new Set<string>();
    map[row.flow_id].add(row.step_id);
  }
  return map;
}

export async function resetProgress(userKey: string, flowId: string): Promise<void> {
  await supabase.from('sop_progress').delete().eq('user_key', userKey).eq('flow_id', flowId);
}

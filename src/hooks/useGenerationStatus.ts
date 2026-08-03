import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase/config';

export type GenerationPhase =
  | 'idle'
  | 'processing'
  | 'ready'
  | 'error';

export interface GenerationStatusRow {
  teacher_username: string;
  phase: GenerationPhase;
  students_pending: number;
  lesson_plan_started_at: string | null;
  lesson_plan_completed_at: string | null;
  groups_ready_at: string | null;
  last_message: string;
  updated_at: string;
}

const STALE_THRESHOLD_MS = 3 * 60_000;

export function useGenerationStatus(teacherUsername: string) {
  const [status, setStatus] = useState<GenerationStatusRow | null>(null);
  const lastNotifiedRef = useRef<string | null>(null);
  const [readyToast, setReadyToast] = useState(false);

  useEffect(() => {
    if (!teacherUsername) return;

    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from('generation_status')
        .select('*')
        .eq('teacher_username', teacherUsername)
        .maybeSingle();

      if (cancelled) return;

      const row = data as GenerationStatusRow | null;
      if (row && row.phase === 'processing' && row.updated_at) {
        const elapsed = Date.now() - new Date(row.updated_at).getTime();
        if (elapsed > STALE_THRESHOLD_MS) {
          await supabase
            .from('generation_status')
            .update({
              phase: 'ready',
              students_pending: 0,
              groups_ready_at: new Date().toISOString(),
              last_message: 'Groups updated',
              updated_at: new Date().toISOString(),
            })
            .eq('teacher_username', teacherUsername)
            .eq('phase', 'processing');
          const { data: refreshed } = await supabase
            .from('generation_status')
            .select('*')
            .eq('teacher_username', teacherUsername)
            .maybeSingle();
          setStatus((refreshed as GenerationStatusRow) || null);
          return;
        }
      }
      // Also clear legacy stuck states
      if (row && (row.phase === 'lesson_plans_generating' || row.phase === 'groups_cooling_down')) {
        await supabase
          .from('generation_status')
          .update({
            phase: 'ready',
            students_pending: 0,
            groups_ready_at: new Date().toISOString(),
            last_message: 'Groups ready',
            updated_at: new Date().toISOString(),
          })
          .eq('teacher_username', teacherUsername);
        const { data: refreshed } = await supabase
          .from('generation_status')
          .select('*')
          .eq('teacher_username', teacherUsername)
          .maybeSingle();
        setStatus((refreshed as GenerationStatusRow) || null);
        return;
      }
      setStatus(row || null);
    };

    load();

    const channel = supabase
      .channel(`generation_status:${teacherUsername}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_status',
          filter: `teacher_username=eq.${teacherUsername}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as GenerationStatusRow;
          if (row) setStatus(row);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [teacherUsername]);

  useEffect(() => {
    if (!status) return;
    if (status.phase === 'ready' && status.groups_ready_at && lastNotifiedRef.current !== status.groups_ready_at) {
      lastNotifiedRef.current = status.groups_ready_at;
      setReadyToast(true);
      const t = setTimeout(() => setReadyToast(false), 6000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const phase: GenerationPhase = status?.phase || 'idle';
  const canRegenerate = phase === 'idle' || phase === 'ready' || phase === 'error';

  const resetStatus = async () => {
    await supabase
      .from('generation_status')
      .update({
        phase: 'idle',
        students_pending: 0,
        lesson_plan_started_at: null,
        lesson_plan_completed_at: null,
        groups_ready_at: null,
        last_message: 'System idle',
        updated_at: new Date().toISOString(),
      })
      .eq('teacher_username', teacherUsername);
    setStatus(prev => prev ? { ...prev, phase: 'idle', students_pending: 0, last_message: 'System idle' } : null);
  };

  return {
    status,
    phase,
    canRegenerate,
    readyToast,
    dismissReadyToast: () => setReadyToast(false),
    resetStatus,
  };
}

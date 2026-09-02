import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Lightbulb, ImagePlus, Camera, Trash2, Save, Plus } from 'lucide-react';
import {
  listSteps, recordProgress, resetProgress, uploadScreenshot,
  updateStep, createStep, deleteStep, SopFlow, SopStep,
} from '../../services/supabase/sop';

interface Props {
  flow: SopFlow;
  onBack: () => void;
  userKey: string;
  userRole: string;
  isAdmin: boolean;
}

export function SopFlowViewer({ flow, onBack, userKey, userRole, isAdmin }: Props) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SopStep | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: steps = [], isLoading, refetch } = useQuery({
    queryKey: ['sop-steps', flow.id],
    queryFn: () => listSteps(flow.id),
  });

  const step = steps[index];

  useEffect(() => {
    setEditing(false);
    setDraft(null);
  }, [index, flow.id]);

  useEffect(() => {
    if (step && userKey) {
      recordProgress(userKey, userRole, flow.id, step.id).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['sop-progress', userKey] });
    }
  }, [step?.id, userKey, userRole, flow.id, queryClient]);

  const total = steps.length;

  const startEdit = () => {
    if (!step) return;
    setDraft({ ...step });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!draft) return;
    await updateStep(draft.id, {
      title: draft.title,
      body: draft.body,
      target_route: draft.target_route || '',
      target_selector: draft.target_selector || '',
      tip: draft.tip || '',
      screenshot_caption: draft.screenshot_caption || '',
    });
    setEditing(false);
    refetch();
  };

  const onUploadScreenshot = async (file: File) => {
    if (!step) return;
    setUploading(true);
    try {
      const url = await uploadScreenshot(file, file.name);
      await updateStep(step.id, { screenshot_url: url });
      refetch();
    } catch (e) {
      console.error(e);
      alert('Upload failed. Check console.');
    } finally {
      setUploading(false);
    }
  };

  const onCaptureScreen = async () => {
    if (!step) return;
    try {
      const mediaDevices = navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: (c?: DisplayMediaStreamOptions) => Promise<MediaStream>;
      };
      if (!mediaDevices.getDisplayMedia) {
        alert('Screen capture is not supported in this browser.');
        return;
      }
      const stream = await mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      await new Promise(r => setTimeout(r, 250));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(video, 0, 0);
      track.stop();
      stream.getTracks().forEach(t => t.stop());
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('blob failed'))), 'image/png');
      });
      setUploading(true);
      const url = await uploadScreenshot(blob, `step_${step.order_index}.png`);
      await updateStep(step.id, { screenshot_url: url });
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const addStep = async () => {
    const title = prompt('New step title?');
    if (!title) return;
    await createStep({
      flow_id: flow.id,
      title,
      body: '',
      order_index: total + 1,
    });
    await refetch();
    setIndex(total);
  };

  const removeStep = async () => {
    if (!step) return;
    if (!confirm(`Delete step "${step.title}"?`)) return;
    await deleteStep(step.id);
    await refetch();
    setIndex(Math.max(0, index - 1));
  };

  const resetFlow = async () => {
    if (!confirm('Reset your progress for this flow?')) return;
    await resetProgress(userKey, flow.id);
    queryClient.invalidateQueries({ queryKey: ['sop-progress', userKey] });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading steps...</div>
      </div>
    );
  }

  if (!step) {
    return (
      <div className="flex-1 p-6">
        <button onClick={onBack} className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to flows
        </button>
        <p className="text-sm text-gray-500">No steps yet for this flow.</p>
        {isAdmin && (
          <button onClick={addStep} className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <Plus className="w-4 h-4" /> Add first step
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-4 pb-2 border-b border-gray-100">
        <button onClick={onBack} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> All flows
        </button>
        <h3 className="mt-2 text-base font-semibold text-gray-900">{flow.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
          <span>Step {index + 1} of {total}</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${Math.round(((index + 1) / total) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {step.screenshot_url ? (
          <button
            onClick={() => setZoom(true)}
            className="block w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:border-blue-400 transition-colors"
          >
            <img
              src={step.screenshot_url}
              alt={step.screenshot_caption || step.title}
              className="w-full h-auto"
            />
          </button>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-10 text-center text-xs text-gray-400">
            No screenshot yet
          </div>
        )}
        {step.screenshot_caption && (
          <p className="text-[11px] text-gray-500 -mt-2">{step.screenshot_caption}</p>
        )}

        {editing && draft ? (
          <div className="space-y-3">
            <input
              className="w-full text-base font-semibold border border-gray-200 rounded-md px-3 py-2"
              value={draft.title}
              onChange={e => setDraft({ ...draft, title: e.target.value })}
              placeholder="Step title"
            />
            <textarea
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 min-h-[120px]"
              value={draft.body}
              onChange={e => setDraft({ ...draft, body: e.target.value })}
              placeholder="Detailed instructions"
            />
            <input
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
              value={draft.tip || ''}
              onChange={e => setDraft({ ...draft, tip: e.target.value })}
              placeholder="Optional tip"
            />
            <input
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
              value={draft.screenshot_caption || ''}
              onChange={e => setDraft({ ...draft, screenshot_caption: e.target.value })}
              placeholder="Screenshot caption"
            />
            <div className="flex gap-2">
              <input
                className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2"
                value={draft.target_route || ''}
                onChange={e => setDraft({ ...draft, target_route: e.target.value })}
                placeholder="Target route (optional)"
              />
              <input
                className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2"
                value={draft.target_selector || ''}
                onChange={e => setDraft({ ...draft, target_selector: e.target.value })}
                placeholder="Target selector (optional)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveEdit} className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1">
                <Save className="w-4 h-4" /> Save step
              </button>
            </div>
          </div>
        ) : (
          <>
            <h4 className="text-lg font-semibold text-gray-900">{step.title}</h4>
            <p className="text-sm text-gray-700 leading-6 whitespace-pre-wrap">{step.body}</p>
            {step.tip && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-md p-3">
                <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">{step.tip}</p>
              </div>
            )}
          </>
        )}

        {isAdmin && !editing && (
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Author tools</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={startEdit}
                className="px-2.5 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
              >
                Edit step
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="px-2.5 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1"
              >
                <ImagePlus className="w-3.5 h-3.5" /> Upload screenshot
              </button>
              <button
                onClick={onCaptureScreen}
                className="px-2.5 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" /> Capture screen
              </button>
              <button
                onClick={addStep}
                className="px-2.5 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add step
              </button>
              <button
                onClick={removeStep}
                className="px-2.5 py-1.5 text-xs rounded-md border border-red-100 text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete step
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) onUploadScreenshot(f);
                  e.currentTarget.value = '';
                }}
              />
            </div>
            {uploading && <p className="text-xs text-gray-500">Uploading...</p>}
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
        <button
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-gray-200 bg-white disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <button
          onClick={resetFlow}
          className="text-[11px] text-gray-500 hover:text-red-600"
        >
          Reset progress
        </button>
        <button
          onClick={() => setIndex(i => Math.min(total - 1, i + 1))}
          disabled={index === total - 1}
          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white disabled:opacity-40"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {zoom && step.screenshot_url && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6"
          onClick={() => setZoom(false)}
        >
          <img
            src={step.screenshot_url}
            alt={step.screenshot_caption || step.title}
            className="max-h-full max-w-full rounded shadow-xl"
          />
        </div>
      )}
    </div>
  );
}

import { Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { GenerationPhase } from '../hooks/useGenerationStatus';

interface Props {
  phase: GenerationPhase;
  compact?: boolean;
  onReset?: () => void;
}

const PHASE_META: Record<GenerationPhase, {
  label: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
  Icon: typeof Loader2;
  pulse: boolean;
}> = {
  idle: {
    label: 'System idle',
    dot: 'bg-gray-400',
    text: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    Icon: CheckCircle2,
    pulse: false,
  },
  processing: {
    label: 'Updating groups with new assessment...',
    dot: 'bg-amber-500',
    text: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    Icon: Loader2,
    pulse: true,
  },
  ready: {
    label: 'Groups updated — ready to generate lesson plans',
    dot: 'bg-green-500',
    text: 'text-green-800',
    bg: 'bg-green-50',
    border: 'border-green-200',
    Icon: CheckCircle2,
    pulse: false,
  },
  error: {
    label: 'Update failed — try regenerating groups',
    dot: 'bg-red-500',
    text: 'text-red-800',
    bg: 'bg-red-50',
    border: 'border-red-200',
    Icon: AlertCircle,
    pulse: false,
  },
};

export function GenerationStatusBadge({ phase, compact, onReset }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const meta = PHASE_META[phase];
  const { Icon } = meta;

  if (phase === 'idle') return null;

  return (
    <div className={`relative inline-flex items-center gap-2 rounded-full border ${meta.border} ${meta.bg} ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${meta.text}`}>
      <span className="relative flex items-center justify-center">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${meta.dot}`} />
        {meta.pulse && (
          <span className={`absolute inline-block w-2.5 h-2.5 rounded-full ${meta.dot} opacity-60 animate-ping`} />
        )}
      </span>
      <Icon className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${meta.pulse ? 'animate-spin' : ''}`} />
      <span className="font-medium whitespace-nowrap">{meta.label}</span>
      {phase === 'error' && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="ml-1 px-2 py-0.5 text-xs rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium"
        >
          Dismiss
        </button>
      )}
      <button
        type="button"
        onClick={() => setShowInfo(v => !v)}
        className="ml-0.5 text-current opacity-60 hover:opacity-100"
        aria-label="What does this status mean?"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {showInfo && (
        <div className="absolute top-full mt-2 right-0 z-50 w-72 p-3 rounded-lg border border-gray-200 bg-white shadow-lg text-xs text-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-900 mb-1">How it works</p>
          <p className="mb-2">
            When a student completes an assessment, the system automatically updates the weekly groups based on their results.
          </p>
          <p>
            Click "Generate Lesson Plan" on any group to create a detailed, step-by-step plan for that group's specific needs.
          </p>
          <button onClick={() => setShowInfo(false)} className="mt-2 text-blue-600 hover:underline">Got it</button>
        </div>
      )}
    </div>
  );
}

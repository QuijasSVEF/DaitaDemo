import { useEffect, useState } from 'react';
import { DEMO_MODE, DEMO_LATENCY } from '../config/demoMode';

const STATUS_LINES: Record<string, string[]> = {
  grouping: ['Reading response patterns…', 'Clustering by struggle area…', 'Balancing group size…'],
  lessonPlan: ['Pulling standard…', 'Applying UDL guidelines…', 'Sequencing activity…'],
};

interface Props {
  type: 'grouping' | 'lessonPlan';
  isActive: boolean;
}

export function DemoStatusText({ type, isActive }: Props) {
  const lines = STATUS_LINES[type];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isActive || !DEMO_MODE) return;
    setIndex(0);
    const totalMs = DEMO_LATENCY[type];
    const interval = totalMs / lines.length;
    const timer = setInterval(() => {
      setIndex(prev => (prev < lines.length - 1 ? prev + 1 : prev));
    }, interval);
    return () => clearInterval(timer);
  }, [isActive, type, lines.length]);

  if (!isActive || !DEMO_MODE) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 animate-pulse">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      <span>{lines[index]}</span>
    </div>
  );
}

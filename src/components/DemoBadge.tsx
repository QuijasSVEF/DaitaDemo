import { DEMO_MODE } from '../config/demoMode';

export function DemoBadge() {
  if (!DEMO_MODE) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[9999] pointer-events-none select-none">
      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-gray-800/70 text-gray-200 backdrop-blur-sm">
        Demo
      </span>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { BookOpen, GripVertical } from 'lucide-react';
import { SopDrawer } from './SopDrawer';

interface Props {
  userKey: string;
  userRole: 'teacher' | 'student' | 'admin' | 'coach' | 'mentor' | 'anon';
  isAdmin?: boolean;
}

const STORAGE_KEY = 'sop-launcher-position';
const BUTTON_W = 140;
const BUTTON_H = 144;

interface Position {
  x: number;
  y: number;
}

function getDefaultPosition(): Position {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return {
    x: Math.max(0, window.innerWidth / 2 - BUTTON_W / 2),
    y: Math.max(0, window.innerHeight / 2 - BUTTON_H / 2),
  };
}

function clampToViewport(p: Position): Position {
  if (typeof window === 'undefined') return p;
  const maxX = Math.max(0, window.innerWidth - BUTTON_W);
  const maxY = Math.max(0, window.innerHeight - BUTTON_H);
  return {
    x: Math.min(Math.max(0, p.x), maxX),
    y: Math.min(Math.max(0, p.y), maxY),
  };
}

export function SopLauncher({ userKey, userRole, isAdmin = false }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Position;
        return clampToViewport(parsed);
      }
    } catch {
      /* ignore */
    }
    return getDefaultPosition();
  });
  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const onResize = () => setPosition(p => clampToViewport(p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch {
      /* ignore */
    }
  }, [position]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragState.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && Math.hypot(dx, dy) > 3) s.moved = true;
    if (s.moved) {
      setPosition(clampToViewport({ x: s.originX + dx, y: s.originY + dy }));
    }
  };

  const endDrag = () => {
    const s = dragState.current;
    dragState.current = null;
    return s?.moved ?? false;
  };

  const onPointerUp = () => {
    endDrag();
  };

  const onButtonClick = () => {
    if (dragState.current?.moved) return;
    setOpen(true);
  };

  return (
    <>
      <div
        style={{ left: position.x, top: position.y }}
        className="fixed z-40 flex items-center bg-white border border-gray-200 shadow-lg hover:shadow-xl rounded-full pl-1 pr-1 py-1 text-sm font-medium text-gray-700 transition-shadow"
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="px-1 py-1.5 cursor-move text-gray-400 hover:text-gray-600 select-none"
          title="Drag to move"
          aria-label="Drag to reposition SOP button"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <button
          onClick={onButtonClick}
          className="group inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:text-blue-700"
          title="Open interactive SOP"
          aria-label="Open interactive SOP"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white group-hover:bg-blue-700 transition-colors">
            <BookOpen className="w-4 h-4" />
          </span>
          <span className="hidden sm:inline">SOP Guide</span>
        </button>
      </div>
      {open && (
        <SopDrawer
          onClose={() => setOpen(false)}
          userKey={userKey}
          userRole={userRole}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}

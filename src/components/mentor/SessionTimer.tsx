import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Timer } from 'lucide-react';

interface Props {
  onTimeUpdate: (minutes: number) => void;
  initialMinutes?: number;
}

export function SessionTimer({ onTimeUpdate, initialMinutes = 0 }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(initialMinutes * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          onTimeUpdate(Math.floor(next / 60));
          return next;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const handleStop = () => {
    setIsRunning(false);
    onTimeUpdate(Math.max(1, minutes));
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
    onTimeUpdate(0);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Session Timer</span>
        </div>
        <span className="text-xs text-blue-600">Optional auto-tracking</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className={`text-3xl font-mono font-bold tabular-nums ${isRunning ? 'text-blue-700' : 'text-gray-700'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-3">
        {!isRunning ? (
          <button
            type="button"
            onClick={() => setIsRunning(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            {elapsed > 0 ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsRunning(false)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors"
          >
            <Pause className="w-3.5 h-3.5" />
            Pause
          </button>
        )}
        {elapsed > 0 && (
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Stop & Use Time
          </button>
        )}
        {elapsed > 0 && !isRunning && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {elapsed > 0 && (
        <p className="text-xs text-center text-blue-600 mt-2">
          Timer: {minutes} min recorded. Click "Stop & Use Time" to auto-fill duration.
        </p>
      )}
    </div>
  );
}

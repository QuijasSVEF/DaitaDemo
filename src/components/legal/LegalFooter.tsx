import { useState } from 'react';
import { PolicyViewerModal } from './PolicyViewerModal';

export function LegalFooter() {
  const [showPolicy, setShowPolicy] = useState(false);

  return (
    <>
      <footer className="border-t border-gray-200/80 bg-white/60 backdrop-blur-sm px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xs text-gray-400 font-open-sans">
            &copy; 2026 Silicon Valley Education Foundation
          </span>
          <button
            onClick={() => setShowPolicy(true)}
            className="text-xs text-gray-400 hover:text-svef-gray font-open-sans transition-colors hover:underline"
          >
            Terms of Service &amp; Privacy Policy
          </button>
        </div>
      </footer>
      {showPolicy && <PolicyViewerModal onClose={() => setShowPolicy(false)} />}
    </>
  );
}

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}

export function RegenerateButton({ onClick, isLoading, className }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "inline-flex items-center space-x-2 px-4 py-2 border border-transparent",
        "text-sm font-medium rounded-md shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-svef-purple",
       "transition-all duration-200",
        isLoading
         ? "bg-svef-purple/70 text-white cursor-not-allowed opacity-75"
          : "bg-svef-purple text-white hover:bg-svef-purple/90",
        className
      )}
     aria-label={isLoading ? "Regenerating lesson plan..." : "Regenerate lesson plan"}
    >
      <RefreshCw className={cn(
        "w-4 h-4",
       isLoading && "animate-spin duration-1000"
      )} />
     <span className="font-medium">
       {isLoading ? 'Regenerating...' : 'Regenerate'}
     </span>
    </button>
  );
}
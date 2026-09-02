import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className,
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <button
      disabled={isLoading || disabled}
      className={cn(
        "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm",
        "font-open-sans text-sm font-medium",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        variant === 'primary' && [
          "text-white focus:ring-svef-green",
          isLoading || disabled
            ? "bg-svef-green/70 cursor-not-allowed"
            : "bg-svef-green hover:bg-svef-green/90"
        ],
        variant === 'secondary' && [
          "text-svef-gray border-svef-gray/20 focus:ring-svef-gray",
          isLoading || disabled
            ? "bg-gray-100 cursor-not-allowed"
            : "bg-white hover:bg-gray-50"
        ],
        className
      )}
      {...props}
    >
      {isLoading ? 'Processing...' : children}
    </button>
  );
}
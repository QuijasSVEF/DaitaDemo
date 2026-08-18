import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
  isActive: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

export function NavItem({ isActive, onClick, icon: Icon, label }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn( 
        "px-4 py-3 text-sm font-medium flex items-center space-x-2 transition-colors",
        isActive
          ? "text-svef-purple border-b-2 border-svef-purple bg-svef-purple/5"
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
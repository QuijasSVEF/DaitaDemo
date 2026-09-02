import React from 'react';

export function Logo() {
  return (
    <div className="flex items-center">
      <div className="flex items-center">
        <span className="font-oswald text-svef-gray text-2xl font-bold">SV</span>
        <span className="font-oswald text-svef-green text-2xl font-bold">[e]</span>
        <span className="font-oswald text-svef-gray text-2xl font-bold">F</span>
      </div>
      <div className="ml-2 border-l border-gray-300 pl-2">
        <div className="font-oswald text-svef-gray text-sm leading-tight">
          SILICON VALLEY
          <br />
          EDUCATION
          <br />
          FOUNDATION
        </div>
      </div>
    </div>
  );
}
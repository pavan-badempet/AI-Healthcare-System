import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const posClass =
    position === 'bottom'
      ? 'top-full left-1/2 -translate-x-1/2 mt-2'
      : position === 'left'
      ? 'right-full top-1/2 -translate-y-1/2 mr-2'
      : position === 'right'
      ? 'left-full top-1/2 -translate-y-1/2 ml-2'
      : 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 px-2.5 py-1.5 text-[11px] font-medium text-white bg-slate-900 border border-slate-700 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in duration-150 ${posClass}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}

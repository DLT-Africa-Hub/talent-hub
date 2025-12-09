import React, { useState, useRef, useEffect, cloneElement } from 'react';

interface DropdownMenuProps {
  children: React.ReactNode;
}

interface TriggerProps {
  children: React.ReactElement;
}

interface ContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DropdownMenu = ({ children }: DropdownMenuProps) => {
  return <div className="relative ">{children}</div>;
};

export const DropdownMenuTrigger = ({ children }: TriggerProps) => {
  const [open, setOpen] = useState(false);

  // Wrap children so we can toggle the menu
  return cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen((prev: boolean) => !prev);

      // Save state globally for content
      (window as Window & { __dropdown_open?: boolean }).__dropdown_open =
        !open;
      document.dispatchEvent(new Event('dropdown-toggle'));
    },
  });
};

export const DropdownMenuContent = ({
  children,
  className = '',
}: ContentProps) => {
  const [open, setOpen] = useState(
    (window as Window & { __dropdown_open?: boolean }).__dropdown_open || false
  );
  const ref = useRef<HTMLDivElement>(null);

  // Listen for trigger toggle
  useEffect(() => {
    const listener = () => {
      setOpen(
        (window as Window & { __dropdown_open?: boolean }).__dropdown_open ||
          false
      );
    };
    document.addEventListener('dropdown-toggle', listener);

    return () => document.removeEventListener('dropdown-toggle', listener);
  }, []);

  // Close on click outside
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (ref.current && e.target && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        // Track dropdown state if needed
      }
    };
    document.addEventListener('click', clickHandler);

    return () => document.removeEventListener('click', clickHandler);
  }, []);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`absolute right-0 mt-2 min-w-[180px] rounded-md backdrop-blur-xl bg-white/80 border border-white/20 shadow-2xl p-1 z-50 ${className}`}
    >
      {children}
    </div>
  );
};

export const DropdownMenuLabel = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`px-3 py-2 text-xs font-semibold text-gray-700 ${className}`}>
    {children}
  </div>
);

export const DropdownMenuSeparator = ({
  className = '',
}: {
  className?: string;
}) => <div className={`h-px bg-white/20 my-1 ${className}`} />;

export const DropdownMenuItem = ({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-white/10 transition ${className}`}
  >
    {children}
  </button>
);

export default DropdownMenu;

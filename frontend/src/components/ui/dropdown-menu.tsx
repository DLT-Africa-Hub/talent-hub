import React, { useState, useRef, useEffect, cloneElement } from "react";

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
    onClick: (e: any) => {
      e.stopPropagation();
      setOpen((prev: boolean) => !prev);

      // Save state globally for content
      (window as any).__dropdown_open = !open;
      document.dispatchEvent(new Event("dropdown-toggle"));
    },
  });
};

export const DropdownMenuContent = ({
  children,
  className = "",
}: ContentProps) => {
  const [open, setOpen] = useState((window as any).__dropdown_open || false);
  const ref = useRef<HTMLDivElement>(null);

  // Listen for trigger toggle
  useEffect(() => {
    const listener = () => {
      setOpen((window as any).__dropdown_open);
    };
    document.addEventListener("dropdown-toggle", listener);

    return () => document.removeEventListener("dropdown-toggle", listener);
  }, []);

  // Close on click outside
  useEffect(() => {
    const clickHandler = (e: any) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        (window as any).__dropdown_open = false;
      }
    };
    document.addEventListener("click", clickHandler);

    return () => document.removeEventListener("click", clickHandler);
  }, []);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`absolute right-0 mt-2 min-w-[180px] rounded-md border shadow-lg p-1 z-50 ${className}`}
    >
      {children}
    </div>
  );
};

export const DropdownMenuLabel = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={`px-3 py-2 text-xs font-semibold text-gray-500 ${className}`}>
      {children}
    </div>
  );

export const DropdownMenuSeparator = ({ className = "" }: { className?: string }) => (
    <div className={`h-px bg-gray-200 my-1 ${className}`} />
  );

export const DropdownMenuItem = ({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-gray-100 transition ${className}`}
  >
    {children}
  </button>
);

export default DropdownMenu;

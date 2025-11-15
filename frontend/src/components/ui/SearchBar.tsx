import React, { useState, useRef, forwardRef } from 'react';
import { BsSearch } from 'react-icons/bs';
import { HiX } from 'react-icons/hi';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxWidth?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      placeholder = 'Search...',
      className = '',
      maxWidth = 'max-w-[708px]',
      onFocus,
      onBlur,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const combinedRef = (ref || inputRef) as React.RefObject<HTMLInputElement>;

    const handleFocus = () => {
      setIsFocused(true);
      onFocus?.();
    };

    const handleBlur = () => {
      setIsFocused(false);
      onBlur?.();
    };

    const handleClear = () => {
      onChange('');
      combinedRef.current?.focus();
    };

    return (
      <div
        className={`relative flex gap-2.5 items-center px-5 py-[13.5px] border rounded-[10px] w-full ${maxWidth} transition-all duration-200 ${
          isFocused
            ? 'border-button bg-white shadow-[0_0_0_3px_rgba(27,119,0,0.1)]'
            : 'border-fade bg-white hover:border-button/50'
        } ${className}`}
      >
        <BsSearch
          className={`text-[18px] transition-colors duration-200 flex-shrink-0 ${
            isFocused ? 'text-button' : 'text-fade'
          }`}
        />
        <input
          ref={combinedRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full placeholder:text-fade text-[#1c1c1c] outline-none bg-transparent text-[15px]"
          placeholder={placeholder}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 p-1 rounded-full hover:bg-fade transition-colors duration-200 flex items-center justify-center group flex-shrink-0"
            aria-label="Clear search"
          >
            <HiX
              className={`text-[18px] transition-colors duration-200 ${
                isFocused
                  ? 'text-[#1C1C1C80] group-hover:text-[#1C1C1C]'
                  : 'text-fade group-hover:text-[#1C1C1C80]'
              }`}
            />
          </button>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';

export default SearchBar;


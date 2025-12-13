import React, { useState, useRef, useEffect } from 'react';
import { HiChevronDown, HiX } from 'react-icons/hi';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  required?: boolean;
  error?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxHeight?: string;
  searchable?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  required = false,
  error,
  options,
  value = [],
  onChange,
  placeholder = 'Select options',
  className = '',
  maxHeight = '300px',
  searchable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const getSelectedLabels = () => {
    return value
      .map((val) => options.find((opt) => opt.value === val)?.label)
      .filter(Boolean) as string[];
  };

  const selectedLabels = getSelectedLabels();

  return (
    <div
      className={`flex flex-col gap-2 relative ${className}`}
      ref={dropdownRef}
    >
      {label && (
        <label className="text-[#1C1C1C] text-[16px] font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`py-3 border rounded-xl w-full px-4 bg-[#FFFFFF] text-[#1C1C1C] text-[15px] focus:outline-none focus:ring-2 focus:ring-button focus:border-transparent transition-all cursor-pointer text-left flex items-center justify-between gap-2 ${
          error ? 'border-red-500' : 'border-fade'
        } ${isOpen ? 'ring-2 ring-button border-transparent' : ''}`}
      >
        <div className="flex-1 flex items-center gap-2 flex-wrap min-h-[24px]">
          {selectedLabels.length === 0 ? (
            <span className="text-[#1C1C1C80]">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedLabels.slice(0, 3).map((label) => {
                const optionValue = options.find(
                  (opt) => opt.label === label
                )?.value;
                return (
                  <span
                    key={optionValue}
                    className="inline-flex items-center gap-1 bg-button/10 text-[#1C1C1C] px-2 py-1 rounded-md text-[14px] font-medium"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={(e) => handleRemove(optionValue!, e)}
                      className="hover:bg-button/20 rounded-full p-0.5 transition-colors"
                    >
                      <HiX className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              {selectedLabels.length > 3 && (
                <span className="text-[#1C1C1C80] text-[14px]">
                  +{selectedLabels.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
        <HiChevronDown
          className={`text-[20px] transition-transform flex-shrink-0 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 bg-white border border-fade rounded-xl shadow-lg"
          style={{ maxHeight }}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-fade sticky top-0 bg-white rounded-t-xl">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search options..."
                className="w-full py-2 px-3 border border-fade rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-button focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Options List */}
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: `calc(${maxHeight} - ${searchable ? '60px' : '0px'})`,
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-[#1C1C1C80] text-[14px]">
                {searchTerm ? 'No options found' : 'No options available'}
              </div>
            ) : (
              <div className="p-2">
                {filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggle(option.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'bg-button/10 text-[#1C1C1C] font-medium'
                          : 'hover:bg-gray-50 text-[#1C1C1C]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-button bg-button' : 'border-fade'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-[15px]">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-[14px] font-normal">{error}</p>}
    </div>
  );
};

export default MultiSelect;

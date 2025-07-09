'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Button } from './button';
import { Check, ChevronDown, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Поиск...",
  className = "",
  disabled = false,
  required = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update filtered options when search term or options change
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (option.sublabel && option.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get selected option display text
  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : '';

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayText}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="pr-20"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0 mr-1"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 w-8 p-0 mr-1"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Ничего не найдено
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between
                  ${value === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'}
                `}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{option.label}</div>
                  {option.sublabel && (
                    <div className="text-xs text-gray-500 truncate">{option.sublabel}</div>
                  )}
                </div>
                {value === option.value && (
                  <Check className="h-4 w-4 text-blue-600 ml-2 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
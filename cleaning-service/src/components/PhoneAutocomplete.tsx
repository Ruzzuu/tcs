'use client';

// ============================================
// PHONE AUTOCOMPLETE COMPONENT
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { PhoneAutocompleteProps, PhoneCacheData } from '@/types';

const CACHE_KEY = 'admin_phone_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export default function PhoneAutocomplete({
  value,
  onChange,
  placeholder = '0812xxxx...',
  required = false,
  className = ''
}: PhoneAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allPhones, setAllPhones] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load phone numbers from cache or API
  useEffect(() => {
    const loadPhones = async () => {
      // Check localStorage first
      const cached = localStorage.getItem(CACHE_KEY);
      
      if (cached) {
        try {
          const cacheData: PhoneCacheData = JSON.parse(cached);
          const now = Date.now();
          
          // Check if cache is still valid (less than 1 hour old)
          if (now - cacheData.timestamp < CACHE_DURATION) {
            setAllPhones(cacheData.phones);
            return;
          }
        } catch (error) {
          console.error('Error parsing phone cache:', error);
        }
      }

      // Cache expired or doesn't exist, fetch from API
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/phones');
        if (response.ok) {
          const phones: string[] = await response.json();
          
          // Remove duplicates using Set
          const uniquePhones = Array.from(new Set(phones));
          
          setAllPhones(uniquePhones);
          
          // Save to localStorage with timestamp
          const cacheData: PhoneCacheData = {
            phones: uniquePhones,
            timestamp: Date.now()
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        }
      } catch (error) {
        console.error('Error fetching phone numbers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPhones();
  }, []);

  // Filter suggestions based on input value
  useEffect(() => {
    if (value && allPhones.length > 0) {
      const filtered = allPhones.filter(phone => 
        phone.toLowerCase().startsWith(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [value, allPhones]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = (phone: string) => {
    // Create a synthetic event to match the onChange prop type
    const syntheticEvent = {
      target: { value: phone },
      currentTarget: { value: phone }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Handle input focus
  const handleFocus = () => {
    if (value && suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="tel"
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#101622] text-[#111318] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 transition-all"
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-[#1152d4] rounded-full animate-spin"></div>
        </div>
      )}

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-[#101622] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
          {suggestions.map((phone, index) => (
            <button
              key={`${phone}-${index}`}
              type="button"
              onClick={() => handleSuggestionClick(phone)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-[#111318] dark:text-white transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {phone}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

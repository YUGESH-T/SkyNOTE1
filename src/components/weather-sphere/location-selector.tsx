
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { locations } from '@/lib/weather-data';

interface LocationSelectorProps {
  onLocationSearch: (location: string) => void;
  isLoading: boolean;
  initialLocation?: string;
}

export default function LocationSelector({ onLocationSearch, isLoading, initialLocation = '' }: LocationSelectorProps) {
  const [location, setLocation] = useState(initialLocation);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation]);

  const handleSearch = () => {
    if (location && !isLoading) {
      onLocationSearch(location);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
        handleSearch();
    }
  };

  const fetchLocalSuggestions = useCallback((input: string) => {
    if (input.length < 1) {
      setSuggestions([]);
      return;
    }
    const lowercasedInput = input.toLowerCase();
    const filteredSuggestions = locations
      .map(l => l.location)
      .filter(l => l.toLowerCase().startsWith(lowercasedInput))
      .slice(0, 5);
    setSuggestions(filteredSuggestions);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (location && showSuggestions) {
        fetchLocalSuggestions(location);
      } else {
        setSuggestions([]);
      }
    }, 100);

    return () => {
      clearTimeout(handler);
    };
  }, [location, fetchLocalSuggestions, showSuggestions]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setLocation(suggestion);
    setShowSuggestions(false);
    onLocationSearch(suggestion);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full" ref={suggestionBoxRef}>
      <div className="flex w-full items-center space-x-2">
        <div className="relative flex-grow">
            <Input
              ref={inputRef}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Enter a city..."
              className="text-base bg-card/40 backdrop-blur-md border-white/20 shadow-lg h-12"
              disabled={isLoading}
              autoComplete="off"
            />
        </div>
        <Button type="submit" onClick={handleSearch} disabled={isLoading || !location} className="h-12 shrink-0">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          <span className="sr-only">Search</span>
        </Button>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-10 w-full mt-2 bg-card/80 backdrop-blur-md border-white/20 shadow-xl animate-in fade-in-0 zoom-in-95">
          <CardContent className="p-2">
            <ul>
              {suggestions.map((s, index) => (
                <li
                  key={index}
                  onClick={() => handleSuggestionClick(s)}
                  className="px-4 py-2 cursor-pointer rounded-md hover:bg-white/20 text-sm sm:text-base"
                >
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

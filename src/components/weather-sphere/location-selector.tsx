
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

  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation]);

  const handleSearch = () => {
    if (location && !isLoading) {
      onLocationSearch(location);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
        if (event.ctrlKey || !event.ctrlKey) { // Allow enter to search as well
            handleSearch();
        }
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
      .slice(0, 5); // Limit to 5 suggestions
    setSuggestions(filteredSuggestions);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (location && showSuggestions) {
        fetchLocalSuggestions(location);
      } else {
        setSuggestions([]);
      }
    }, 150); // A short debounce for responsiveness

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
    onLocationSearch(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full" ref={suggestionBoxRef}>
      <div className="flex w-full items-center space-x-2">
        <div className="relative flex-grow">
            <Input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Enter a city..."
              className="text-lg bg-card/30 backdrop-blur-sm border-white/20 shadow-lg h-12"
              disabled={isLoading}
              autoComplete="off"
            />
        </div>
        <Button type="submit" onClick={handleSearch} disabled={isLoading || !location} className="h-12">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
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
                  className="px-4 py-2 cursor-pointer rounded-md hover:bg-white/20"
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

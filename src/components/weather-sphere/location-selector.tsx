"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from 'lucide-react';
import { getLocationSuggestions } from '@/ai/flows/get-location-suggestions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

interface LocationSelectorProps {
  onLocationSearch: (location: string) => void;
  isLoading: boolean;
  initialLocation?: string;
}

export default function LocationSelector({ onLocationSearch, isLoading, initialLocation = '' }: LocationSelectorProps) {
  const [location, setLocation] = useState(initialLocation);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(initialLocation) {
        setLocation(initialLocation)
    }
  }, [initialLocation])

  const handleSearch = () => {
    if (location && !isLoading) {
      onLocationSearch(location);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await getLocationSuggestions({ input });
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      toast({
        variant: "destructive",
        title: "Suggestion Error",
        description: "Could not fetch location suggestions."
      })
    } finally {
      setIsSuggesting(false);
    }
  }, [toast]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (location) {
        fetchSuggestions(location);
      } else {
        setSuggestions([]);
      }
    }, 300); // Debounce API calls

    return () => {
      clearTimeout(handler);
    };
  }, [location, fetchSuggestions]);

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
              placeholder="Enter a city"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              className="text-lg bg-card/30 backdrop-blur-sm border-white/20 shadow-lg h-12"
              disabled={isLoading}
            />
            {isSuggesting && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}
        </div>
        <Button type="submit" onClick={handleSearch} disabled={isLoading} className="h-12">
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

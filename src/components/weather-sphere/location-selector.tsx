"use client";

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from 'lucide-react';

interface LocationSelectorProps {
  onLocationSearch: (location: string) => void;
  isLoading: boolean;
}

export default function LocationSelector({ onLocationSearch, isLoading }: LocationSelectorProps) {
  const [location, setLocation] = useState('New York');

  const handleSearch = () => {
    if (location && !isLoading) {
      onLocationSearch(location);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex w-full items-center space-x-2">
      <Input
        type="text"
        placeholder="Enter a city name..."
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        onKeyDown={handleKeyDown}
        className="text-lg bg-card/30 backdrop-blur-sm border-white/20 shadow-lg h-12"
        disabled={isLoading}
      />
      <Button type="submit" onClick={handleSearch} disabled={isLoading} className="h-12">
        <Search className="h-5 w-5" />
      </Button>
    </div>
  );
}

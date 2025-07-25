"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { locations, type WeatherData } from "@/lib/weather-data";

interface LocationSelectorProps {
  onLocationChange: (location: WeatherData) => void;
  currentLocation: WeatherData;
}

export default function LocationSelector({ onLocationChange, currentLocation }: LocationSelectorProps) {
  const handleValueChange = (value: string) => {
    const selectedLocation = locations.find((loc) => loc.location === value);
    if (selectedLocation) {
      onLocationChange(selectedLocation);
    }
  };

  return (
    <Select onValueChange={handleValueChange} defaultValue={currentLocation.location}>
      <SelectTrigger className="w-full text-lg bg-card/30 backdrop-blur-sm border-white/20 shadow-lg h-12">
        <SelectValue placeholder="Select a location" />
      </SelectTrigger>
      <SelectContent>
        {locations.map((loc) => (
          <SelectItem key={loc.location} value={loc.location} className="text-lg">
            {loc.location}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

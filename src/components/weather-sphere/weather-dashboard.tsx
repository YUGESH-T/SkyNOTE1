"use client";

import { useState, useEffect, useTransition } from 'react';
import { locations, type WeatherData } from '@/lib/weather-data';
import WeatherVisualization from './weather-visualization';
import CurrentWeather from './current-weather';
import WeatherForecast from './weather-forecast';
import LocationSelector from './location-selector';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getWeatherData } from '@/ai/flows/get-weather-data';
import HourlyForecast from './hourly-forecast';

const weatherColorClasses = {
  Sunny: "from-sky-400 to-blue-600",
  Cloudy: "from-slate-400 to-gray-600",
  Rainy: "from-indigo-500 to-slate-800",
  Snowy: "from-blue-200 to-cyan-400",
  Night: "from-gray-800 to-slate-900"
};

function getIsNight(currentTime: string, sunrise: string, sunset: string): boolean {
  if (!currentTime || !sunrise || !sunset) return false;
  const now = parseInt(currentTime.replace(':', ''), 10);
  const rise = parseInt(sunrise.replace(':', ''), 10);
  const set = parseInt(sunset.replace(':', ''), 10);
  return now < rise || now > set;
}

export default function WeatherDashboard() {
  const [currentWeather, setCurrentWeather] = useState<WeatherData>(locations[0]);
  const [isMounted, setIsMounted] = useState(false);
  const [isSearching, startSearching] = useTransition();
  const [animationClass, setAnimationClass] = useState('opacity-0');

  const { toast } = useToast();

  useEffect(() => {
    handleLocationSearch(currentWeather.location);
    setIsMounted(true);
    setAnimationClass('opacity-100');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleLocationSearch = (location: string) => {
    startSearching(async () => {
      setAnimationClass('opacity-0');
      try {
        const newWeather = await getWeatherData({ location });
        setTimeout(() => {
            setCurrentWeather(newWeather);
            setAnimationClass('opacity-100');
             toast({
              title: `Weather updated for ${newWeather.location}`,
              description: `Currently ${newWeather.condition}, ${newWeather.temperature}°C.`,
            });
        }, 500)
      } catch (error) {
        console.error("Failed to fetch weather data:", error);
        toast({
          variant: "destructive",
          title: "Search Failed",
          description: "Could not fetch weather data for that location.",
        });
        setAnimationClass('opacity-100');
      }
    });
  };

  if (!isMounted) {
    return (
      <div className="w-full max-w-7xl h-screen flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const isNight = getIsNight(currentWeather.currentTime, currentWeather.sunrise, currentWeather.sunset);
  const backgroundClass = isNight ? weatherColorClasses.Night : weatherColorClasses[currentWeather.condition] || "from-gray-400 to-gray-600";
  
  return (
    <div className={`w-full max-w-7xl mx-auto p-4 md:p-6 rounded-2xl shadow-2xl bg-gradient-to-br ${backgroundClass} transition-all duration-1000 ${animationClass}`}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-[400px] lg:h-[calc(100vh-100px)] relative">
          <WeatherVisualization 
            weatherCondition={currentWeather.condition} 
            sunrise={currentWeather.sunrise}
            sunset={currentWeather.sunset}
            currentTime={currentWeather.currentTime}
          />
          {isSearching && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10">
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6">
          <LocationSelector onLocationSearch={handleLocationSearch} isLoading={isSearching} />
          <CurrentWeather data={currentWeather} />
          <HourlyForecast data={currentWeather} />
          <WeatherForecast data={currentWeather} />
        </div>
      </div>
    </div>
  );
}

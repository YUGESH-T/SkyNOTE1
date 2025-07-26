
"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { type WeatherData } from '@/lib/weather-data';
import WeatherVisualization from './weather-visualization';
import CurrentWeather from './current-weather';
import WeatherForecast from './weather-forecast';
import LocationSelector from './location-selector';
import { Loader2, Compass } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getWeatherData } from '@/ai/flows/get-weather-data';
import HourlyForecast from './hourly-forecast';
import { cn } from '@/lib/utils';
import type {GetWeatherDataInput} from '@/ai/flows/get-weather-data'

const weatherColorClasses = {
  Sunny: "from-sky-400 to-blue-600",
  Cloudy: "from-slate-400 to-gray-600",
  Rainy: "from-indigo-500 to-slate-800",
  Snowy: "from-blue-200 to-cyan-400",
  Thunderstorm: "from-gray-700 via-gray-900 to-black",
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
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isSearching, startSearching] = useTransition();
  const [animationClass, setAnimationClass] = useState('opacity-0');
  const [geolocationStatus, setGeolocationStatus] = useState<'pending' | 'success' | 'error'>('pending');

  const { toast } = useToast();

  const handleLocationSearch = useCallback((params: GetWeatherDataInput) => {
    if (!params.location && !(typeof params.lat === 'number' && typeof params.lon === 'number')) return;
    
    startSearching(async () => {
      if (currentWeather) {
        setAnimationClass('opacity-0');
      }
      try {
        const newWeather = await getWeatherData(params);
        setTimeout(() => {
            setCurrentWeather(newWeather);
            setAnimationClass('opacity-100');
            toast({
              title: `Updated for ${newWeather.location}`,
              description: `Currently ${newWeather.condition}, ${newWeather.temperature}°C.`,
            });
        }, 500)
      } catch (error: any) {
        console.error("Failed to fetch weather data:", error);
        toast({
          variant: "destructive",
          title: "Search Failed",
          description: error.message || "Could not fetch weather data for that location.",
        });
        // If there was previous data, make it visible again
        if (currentWeather) {
            setAnimationClass('opacity-100');
        }
      }
    });
  }, [toast, currentWeather]);

  useEffect(() => {
    setIsMounted(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleLocationSearch({ lat: latitude, lon: longitude });
        setGeolocationStatus('success');
      },
      (error) => {
        console.warn(`Geolocation error: ${error.message}`);
        setGeolocationStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
             toast({
                variant: "default",
                title: "Geolocation Permission Denied",
                description: "Please manually enter a location to get weather information.",
            });
        } else {
            toast({
                variant: "default",
                title: "Geolocation unavailable",
                description: "Could not determine your location. Please enter one manually.",
            });
        }
      },
      { timeout: 10000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full max-w-7xl h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-slate-900">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const isNight = currentWeather ? getIsNight(currentWeather.currentTime, currentWeather.sunrise, currentWeather.sunset) : false;
  const backgroundClass = currentWeather ? (isNight ? weatherColorClasses.Night : weatherColorClasses[currentWeather.condition] || "from-gray-400 to-gray-600") : "from-gray-800 to-slate-900";
  
  const showWelcomeMessage = geolocationStatus === 'error' && !currentWeather;

  return (
    <div className={`w-full max-w-7xl mx-auto p-4 md:p-6 rounded-2xl shadow-2xl bg-gradient-to-br ${backgroundClass} transition-all duration-1000 ${animationClass}`}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={cn(
          "lg:col-span-3 h-[400px] lg:h-auto bg-black/20 backdrop-blur-md shadow-lg",
          currentWeather?.condition !== 'Rainy' && 'border border-white/10 rounded-xl'
        )}>
          {currentWeather && <WeatherVisualization 
            weatherCondition={currentWeather.condition} 
            sunrise={currentWeather.sunrise}
            sunset={currentWeather.sunset}
            currentTime={currentWeather.currentTime}
          />}
          {isSearching && !currentWeather && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10">
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6">
          <LocationSelector onLocationSearch={(location) => handleLocationSearch({ location })} isLoading={isSearching} initialLocation={currentWeather?.location} />
          {currentWeather ? (
            <>
              <CurrentWeather data={currentWeather} />
              <HourlyForecast data={currentWeather} />
              <WeatherForecast data={currentWeather} />
            </>
          ): (
            <div className="h-full flex flex-col items-center justify-center bg-card/30 backdrop-blur-sm border-white/20 shadow-lg rounded-lg p-8 mt-2 text-center">
                 {isSearching || geolocationStatus === 'pending' ? (
                     <>
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Fetching your local weather...</p>
                     </>
                 ) : showWelcomeMessage ? (
                    <>
                        <Compass className="h-16 w-16 text-primary mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Welcome to SKYNOTE</h2>
                        <p className="text-muted-foreground">Enter a city above to get the latest weather forecast and see a beautiful 3D visualization.</p>
                    </>
                 ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

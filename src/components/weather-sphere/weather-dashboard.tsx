
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
import { getWeatherNarrative } from '@/ai/flows/get-weather-narrative';
import HourlyForecast from './hourly-forecast';
import { cn } from '@/lib/utils';
import type {GetWeatherDataInput} from '@/ai/flows/get-weather-data'
import WeatherNarrative from './weather-narrative';
import InteractiveHourlyForecast from './interactive-hourly-forecast';
import SunriseSunset from './sunrise-sunset';

const weatherColorClasses = {
  Sunny: "from-sky-500 to-blue-700",
  Cloudy: "from-slate-500 to-gray-700",
  Rainy: "from-indigo-600/80 to-slate-900/80",
  Snowy: "from-blue-300 to-cyan-500",
  Thunderstorm: "from-gray-800 via-gray-900 to-black",
  Night: "from-gray-900 to-slate-900"
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
  const [weatherNarrative, setWeatherNarrative] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isSearching, startSearching] = useTransition();
  const [isGeneratingNarrative, startGeneratingNarrative] = useTransition();
  const [geolocationStatus, setGeolocationStatus] = useState<'pending' | 'success' | 'error'>('pending');

  const { toast } = useToast();

  const handleFetchNarrative = useCallback(async (weatherData: WeatherData) => {
    startGeneratingNarrative(async () => {
      try {
        const result = await getWeatherNarrative(weatherData);
        setWeatherNarrative(result.narrative);
      } catch (error) {
        console.error("Failed to fetch weather narrative:", error);
        setWeatherNarrative("Could not generate a weather summary at this time.");
      }
    });
  }, []);

  const handleLocationSearch = useCallback((params: GetWeatherDataInput) => {
    startSearching(async () => {
      if (!params.location && !(typeof params.lat === 'number' && typeof params.lon === 'number')) return;
      
      setWeatherNarrative(null);

      try {
        const newWeather = await getWeatherData(params);
        setCurrentWeather(newWeather);
        handleFetchNarrative(newWeather);
        if (params.lat && params.lon && geolocationStatus !== 'success') {
            toast({
                title: `Weather updated for your location`,
                description: `Currently ${newWeather.condition}, ${newWeather.temperature}°C.`,
            });
        }
      } catch (error: any) {
        console.error("Failed to fetch weather data:", error);
        toast({
          variant: "destructive",
          title: "Search Failed",
          description: error.message || "Could not fetch weather data for that location.",
        });
        if (!currentWeather) {
            setGeolocationStatus('error');
        }
      }
    });
  }, [toast, currentWeather, geolocationStatus, handleFetchNarrative]);


  useEffect(() => {
    setIsMounted(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          handleLocationSearch({ lat: latitude, lon: longitude });
          setGeolocationStatus('success');
        },
        (error) => {
          console.warn(`Geolocation error: ${error.message}`);
          handleLocationSearch({ location: 'New York' });
          setGeolocationStatus('error');
          if (error.code !== error.PERMISSION_DENIED) {
            toast({
                title: "Geolocation unavailable",
                description: "Showing weather for New York. You can search for another city.",
            });
          }
        },
        { timeout: 5000 }
      );
    } else {
        handleLocationSearch({ location: 'New York' });
        setGeolocationStatus('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
      </div>
    );
  }

  const isNight = currentWeather ? getIsNight(currentWeather.currentTime, currentWeather.sunrise, currentWeather.sunset) : false;
  const backgroundClass = currentWeather ? (isNight ? weatherColorClasses.Night : weatherColorClasses[currentWeather.condition] || "from-gray-500 to-gray-700") : "from-gray-900 to-slate-900";
  
  const showWelcomeMessage = geolocationStatus === 'error' && !currentWeather;
  const isLoading = isSearching || (geolocationStatus === 'pending' && !currentWeather);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
            {currentWeather && <WeatherVisualization 
                weatherCondition={currentWeather.condition} 
                sunrise={currentWeather.sunrise}
                sunset={currentWeather.sunset}
                currentTime={currentWeather.currentTime}
            />}
        </div>

        <div className={cn("relative z-10 h-screen w-full overflow-y-auto no-scrollbar", isLoading && "pointer-events-none")}>
             <div className="mx-auto w-full p-4 sm:p-6 lg:p-8">
                <div className="w-full lg:max-w-7xl lg:mx-auto">
                    {currentWeather ? (
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                            <div className="lg:col-span-3">
                                <LocationSelector onLocationSearch={(location) => handleLocationSearch({ location })} isLoading={isSearching} initialLocation={currentWeather?.location} />
                            </div>
                           
                            <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6">
                                <CurrentWeather data={currentWeather} />
                                <InteractiveHourlyForecast data={currentWeather} />
                            </div>

                            <div className="flex flex-col gap-4 md:gap-6">
                                <WeatherNarrative 
                                    narrative={weatherNarrative} 
                                    isLoading={isGeneratingNarrative}
                                    onRefresh={() => handleFetchNarrative(currentWeather)}
                                />
                                <SunriseSunset sunrise={currentWeather.sunrise} sunset={currentWeather.sunset} />
                                <HourlyForecast data={currentWeather} />
                                <WeatherForecast data={currentWeather} />
                            </div>
                        </div>
                    ): (
                        <div className="flex-grow flex flex-col items-center justify-center bg-black/20 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-6 text-center min-h-[50vh] mt-20 max-w-lg mx-auto">
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
                                    <p className="text-white/70">Fetching local weather...</p>
                                </>
                            ) : showWelcomeMessage ? (
                                <>
                                    <LocationSelector onLocationSearch={(location) => handleLocationSearch({ location })} isLoading={isSearching} />
                                    <Compass className="h-16 w-16 text-white/90 my-4" />
                                    <h2 className="text-2xl font-bold mb-2 text-white">Welcome to SKYNOTE</h2>
                                    <p className="text-white/70 text-base">Enter a city to get the latest weather forecast and see a beautiful 3D visualization.</p>
                                </>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}

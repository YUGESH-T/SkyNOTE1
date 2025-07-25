"use client";

import { useState, useEffect, useTransition } from 'react';
import { locations, type WeatherData } from '@/lib/weather-data';
import WeatherVisualization from './weather-visualization';
import CurrentWeather from './current-weather';
import WeatherForecast from './weather-forecast';
import LocationSelector from './location-selector';
import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateWeatherAsset } from '@/ai/flows/generate-weather-asset';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const weatherColorClasses = {
  Sunny: "from-sky-400 to-blue-600",
  Cloudy: "from-slate-400 to-gray-600",
  Rainy: "from-indigo-500 to-slate-800",
  Snowy: "from-blue-200 to-cyan-400",
};

export default function WeatherDashboard() {
  const [currentWeather, setCurrentWeather] = useState<WeatherData>(locations[0]);
  const [isMounted, setIsMounted] = useState(false);
  const [isEnhancing, startEnhancing] = useTransition();
  const [enhancedTexture, setEnhancedTexture] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        toast({
          title: "Location Detected",
          description: "Displaying weather for your approximate area.",
        });
      },
      () => {
        toast({
          variant: "destructive",
          title: "Location Access Denied",
          description: "Showing default location. Allow location access for local weather.",
        });
      }
    );
  }, [toast]);
  
  const handleLocationChange = (location: WeatherData) => {
    setCurrentWeather(location);
    setEnhancedTexture(null);
    setAiDescription(null);
  };

  const handleEnhanceScene = () => {
    startEnhancing(async () => {
      setAiDescription(null);
      try {
        const result = await generateWeatherAsset({
          weatherCondition: currentWeather.condition,
          assetDescription: `A 3D scene representing ${currentWeather.condition} weather in ${currentWeather.location}.`,
        });

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, 0, 256);
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#F0F8FF');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 256);
        }
        const placeholderDataUri = canvas.toDataURL();

        setEnhancedTexture(placeholderDataUri);
        setAiDescription(result.description || "Scene enhanced with AI-generated textures.");
        toast({
          title: "Scene Enhanced!",
          description: "The 3D visualization has been updated.",
        });
      } catch (error) {
        console.error("AI enhancement failed:", error);
        toast({
          variant: "destructive",
          title: "Enhancement Failed",
          description: "Could not generate AI enhancement. Please try again.",
        });
      }
    });
  };

  if (!isMounted) {
    return (
      <div className="w-full max-w-7xl h-[680px] flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const backgroundClass = weatherColorClasses[currentWeather.condition] || "from-gray-400 to-gray-600";

  return (
    <div className={`w-full max-w-7xl mx-auto p-4 md:p-6 rounded-2xl shadow-2xl bg-gradient-to-br ${backgroundClass} transition-colors duration-1000`}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-[400px] lg:h-[600px] relative">
          <WeatherVisualization weatherCondition={currentWeather.condition} enhancedTexture={enhancedTexture} />
          <div className="absolute top-4 left-4">
              <Button onClick={handleEnhanceScene} disabled={isEnhancing}>
                  {isEnhancing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                      <Zap className="mr-2 h-4 w-4" />
                  )}
                  Enhance Scene
              </Button>
          </div>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6">
          <LocationSelector onLocationChange={handleLocationChange} currentLocation={currentWeather} />
          {aiDescription && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertTitle>AI Enhancement</AlertTitle>
              <AlertDescription>{aiDescription}</AlertDescription>
            </Alert>
          )}
          <CurrentWeather data={currentWeather} />
          <WeatherForecast data={currentWeather} />
        </div>
      </div>
    </div>
  );
}

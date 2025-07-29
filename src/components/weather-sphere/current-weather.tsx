import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WeatherData } from "@/lib/weather-data";
import WeatherIcon from "./weather-icon";
import { Droplets, Wind, Thermometer } from "lucide-react";

interface CurrentWeatherProps {
  data: WeatherData;
}

export default function CurrentWeather({ data }: CurrentWeatherProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-xl border-white/10 shadow-lg transition-all duration-300 ease-in-out">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl md:text-2xl font-bold">{data.location}</CardTitle>
        <CardDescription className="text-sm text-foreground/80">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-start">
              <p className="text-6xl md:text-7xl font-bold tracking-tighter">{data.temperature}</p>
              <span className="text-xl md:text-2xl font-medium mt-2">°C</span>
            </div>
            <p className="text-base md:text-lg text-foreground/80 -mt-2">{data.condition}</p>
          </div>
          <WeatherIcon condition={data.condition} className="w-20 h-20 md:w-24 md:h-24 text-white drop-shadow-lg" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 md:gap-4 text-center p-2 md:p-4 bg-white/5 rounded-lg">
          <div className="flex flex-col items-center gap-1">
            <Thermometer className="w-5 h-5 md:w-6 md:h-6 text-foreground/80" />
            <p className="font-bold text-sm md:text-base">{data.feelsLike}°C</p>
            <p className="text-xs md:text-sm text-foreground/60">Feels Like</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Droplets className="w-5 h-5 md:w-6 md:h-6 text-foreground/80" />
            <p className="font-bold text-sm md:text-base">{data.humidity}%</p>
            <p className="text-xs md:text-sm text-foreground/60">Humidity</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Wind className="w-5 h-5 md:w-6 md:h-6 text-foreground/80" />
            <p className="font-bold text-sm md:text-base">{data.windSpeed} km/h</p>
            <p className="text-xs md:text-sm text-foreground/60">Wind</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

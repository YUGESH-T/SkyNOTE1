import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WeatherData } from "@/lib/weather-data";
import WeatherIcon from "./weather-icon";
import { Droplets, Wind, Thermometer } from "lucide-react";

interface CurrentWeatherProps {
  data: WeatherData;
}

export default function CurrentWeather({ data }: CurrentWeatherProps) {
  return (
    <Card className="bg-card/30 backdrop-blur-sm border-white/20 shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl md:text-2xl font-bold">{data.location}</CardTitle>
        <CardDescription className="text-xs md:text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-start">
              <p className="text-6xl sm:text-7xl font-bold">{data.temperature}</p>
              <span className="text-xl sm:text-2xl font-medium mt-2">°C</span>
            </div>
            <p className="text-base sm:text-lg text-muted-foreground">{data.condition}</p>
          </div>
          <WeatherIcon condition={data.condition} className="w-20 h-20 sm:w-24 sm:h-24 text-primary drop-shadow-lg" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 text-center p-2 sm:p-4 bg-background/20 rounded-lg">
          <div className="flex flex-col items-center gap-1">
            <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
            <p className="font-bold text-sm sm:text-base">{data.humidity}%</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Humidity</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Wind className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
            <p className="font-bold text-sm sm:text-base">{data.windSpeed} km/h</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Wind</p>
          </div>
           <div className="flex flex-col items-center gap-1">
            <Thermometer className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
            <p className="font-bold text-sm sm:text-base">{data.feelsLike}°C</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Feels Like</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

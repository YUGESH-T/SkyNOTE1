
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherData } from "@/lib/weather-data";
import WeatherIcon from "./weather-icon";
import { Wind } from "lucide-react";

interface HourlyForecastProps {
  data: WeatherData;
}

export default function HourlyForecast({ data }: HourlyForecastProps) {
  return (
    <Card className="bg-card/30 backdrop-blur-sm border-white/20 shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Hourly Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-4 overflow-x-auto pb-4 no-scrollbar">
          {data.hourly.map((item, index) => (
            <div key={`${item.time}-${index}`} className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-background/30 flex-shrink-0 transition-all duration-200 ease-in-out hover:bg-background/50 hover:scale-105 min-w-[70px] md:min-w-[80px]">
              <p className="font-medium text-sm md:text-base text-muted-foreground">{item.time}</p>
              <WeatherIcon condition={item.condition} className="w-8 h-8 md:w-10 md:h-10 text-primary drop-shadow-lg" />
              <p className="font-semibold text-base md:text-lg">{item.temperature}°</p>
              <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                <Wind className="w-3 h-3 md:w-4 md:h-4" />
                <span>{item.windSpeed}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

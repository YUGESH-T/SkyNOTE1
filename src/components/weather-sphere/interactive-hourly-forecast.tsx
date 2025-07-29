import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherData } from "@/lib/weather-data";
import WeatherIcon from "./weather-icon";
import { Wind } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveHourlyForecastProps {
  data: WeatherData;
}

export default function InteractiveHourlyForecast({ data }: InteractiveHourlyForecastProps) {
  return (
    <Card className="bg-card/40 backdrop-blur-md border-white/20 shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-lg md:text-xl">Hourly Forecast</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {data.hourly.map((item, index) => (
                <div key={index} className={cn(
                    "flex flex-col items-center justify-between gap-1 p-2 rounded-lg text-center h-full transition-all duration-200 ease-in-out flex-shrink-0 w-20",
                    "hover:bg-white/10 hover:scale-105"
                )}>
                    <p className="text-xs md:text-sm font-medium text-foreground/80">{item.time}</p>
                    <WeatherIcon condition={item.condition} className="w-8 h-8 text-primary drop-shadow-lg" />
                    <p className="text-base md:text-lg font-bold">{item.temperature}°</p>
                    <div className="flex items-center gap-1 text-xs text-foreground/60">
                        <Wind className="w-3 h-3" />
                        <span>{item.windSpeed}km/h</span>
                    </div>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherData } from "@/lib/weather-data";
import WeatherIcon from "./weather-icon";

interface InteractiveHourlyForecastProps {
  data: WeatherData;
}

export default function InteractiveHourlyForecast({ data }: InteractiveHourlyForecastProps) {
  return (
    <Card className="bg-black/20 backdrop-blur-xl border-white/10 shadow-lg transition-all duration-300 ease-in-out">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Hourly Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-4 overflow-x-auto pb-4 no-scrollbar">
          {data.hourly.map((item, index) => (
            <div key={index} className="flex flex-col items-center space-y-2 flex-shrink-0 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors duration-200 w-24 text-center">
              <p className="text-sm text-foreground/80">{item.time}</p>
              <WeatherIcon condition={item.condition} className="w-8 h-8 text-white drop-shadow-lg" />
              <p className="text-lg font-bold">{item.temperature}°C</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

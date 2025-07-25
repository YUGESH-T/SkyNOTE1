import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherData } from "@/lib/weather-data";
import WeatherIcon from "./weather-icon";

interface HourlyForecastProps {
  data: WeatherData;
}

export default function HourlyForecast({ data }: HourlyForecastProps) {
  return (
    <Card className="bg-card/30 backdrop-blur-sm border-white/20 shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
      <CardHeader>
        <CardTitle>Hourly Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between overflow-x-auto gap-4 pb-2">
          {data.hourly.map((item) => (
            <div key={item.time} className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-background/30 flex-shrink-0 transition-all duration-200 ease-in-out hover:bg-background/50 hover:scale-105">
              <p className="font-medium text-muted-foreground">{item.time}</p>
              <WeatherIcon condition={item.condition} className="w-10 h-10 text-primary drop-shadow-lg" />
              <p className="font-semibold">{item.temperature}°</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

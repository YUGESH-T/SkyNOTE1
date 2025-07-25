import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherData } from "@/lib/weather-data";
import WeatherIcon from "./weather-icon";

interface WeatherForecastProps {
  data: WeatherData;
}

export default function WeatherForecast({ data }: WeatherForecastProps) {
  return (
    <Card className="bg-card/30 backdrop-blur-sm border-white/20 shadow-lg">
      <CardHeader>
        <CardTitle>4-Day Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.forecast.map((item) => (
            <div key={item.day} className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-background/30 transition-all hover:bg-background/50 hover:scale-105">
              <p className="font-medium text-muted-foreground">{item.day}</p>
              <WeatherIcon condition={item.condition} className="w-10 h-10 text-primary drop-shadow-lg" />
              <div className="flex gap-2 font-semibold">
                <span>{item.tempHigh}°</span>
                <span className="text-muted-foreground">{item.tempLow}°</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

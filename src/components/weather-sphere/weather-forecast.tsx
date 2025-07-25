import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherData } from "@/lib/weather-data";
import WeatherIcon from "./weather-icon";
import { Droplets } from "lucide-react";

interface WeatherForecastProps {
  data: WeatherData;
}

export default function WeatherForecast({ data }: WeatherForecastProps) {
  return (
    <Card className="bg-card/30 backdrop-blur-sm border-white/20 shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
      <CardHeader>
        <CardTitle>7-Day Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.forecast.map((item, index) => (
            <div key={`${item.day}-${index}`} className="flex items-center justify-between p-2 rounded-lg transition-all duration-200 ease-in-out hover:bg-background/30 hover:scale-[1.02]">
              <p className="font-medium w-12">{item.day}</p>
              <WeatherIcon condition={item.condition} className="w-8 h-8 text-primary drop-shadow-lg" />
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Droplets className="w-4 h-4" />
                <span>{item.humidity}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold w-8 text-right">{item.tempLow}°</span>
                <div className="w-24 h-2 bg-background/30 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-orange-400"
                    style={{ width: `${((item.tempHigh - item.tempLow) / 15) * 100}%`, marginLeft: `${(item.tempLow / 40) * 100}%` }}
                   />
                </div>
                <span className="font-semibold w-8 text-left">{item.tempHigh}°</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

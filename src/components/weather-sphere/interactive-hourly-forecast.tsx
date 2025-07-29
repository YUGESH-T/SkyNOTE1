
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherData } from "@/lib/weather-data";
import WeatherIcon from "./weather-icon";
import { Droplet, ArrowLeftRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface InteractiveHourlyForecastProps {
  data: WeatherData;
}

export default function InteractiveHourlyForecast({ data }: InteractiveHourlyForecastProps) {
  return (
    <Card className="bg-card/30 backdrop-blur-sm border-white/20 shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-lg md:text-xl">Hourly Forecast</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Carousel opts={{
            align: "start",
            dragFree: true,
        }}
        className="w-full"
        >
            <CarouselContent className="-ml-1">
            {data.hourly.map((item, index) => (
                <CarouselItem key={index} className="basis-1/3 sm:basis-1/4 md:basis-1/5 pl-1">
                    <div className={cn(
                        "flex flex-col items-center justify-center gap-2 p-2 rounded-lg text-center h-full transition-all duration-200 ease-in-out",
                        "hover:bg-white/10 hover:scale-105"
                    )}>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">{item.time}</p>
                        <WeatherIcon condition={item.condition} className="w-8 h-8 text-primary drop-shadow-lg" />
                        <p className="text-xl sm:text-2xl font-bold">{item.temperature}°</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>{item.windSpeed}kmh</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Droplet className="w-3.5 h-3.5" />
                            <span>{item.humidity}%</span>
                        </div>
                    </div>
                </CarouselItem>
            ))}
            </CarouselContent>
        </Carousel>
      </CardContent>
    </Card>
  );
}

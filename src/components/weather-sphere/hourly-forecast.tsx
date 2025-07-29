
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { WeatherData } from "@/lib/weather-data";

interface HourlyForecastProps {
  data: WeatherData;
}

export default function HourlyForecast({ data }: HourlyForecastProps) {
  const chartData = data.hourly.map(item => ({
    time: item.time,
    temperature: item.temperature,
    humidity: item.humidity,
  }));

  const chartConfig = {
    temperature: {
      label: "Temperature",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card className="bg-card/30 backdrop-blur-sm border-white/20 shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Temperature Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[150px] w-full">
          <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="fillTemperature" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-temperature)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-temperature)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsla(var(--foreground), 0.1)" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value, index) => index % 4 === 0 ? value : ""}
              className="text-xs fill-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}°`}
              className="text-xs fill-muted-foreground"
            />
            <Tooltip cursor={{ stroke: 'hsla(var(--foreground), 0.2)', strokeWidth: 1 }} content={<ChartTooltipContent indicator="line" labelFormatter={(label, payload) => {
              const data = payload[0]?.payload;
              return data ? `${data.time}: ${data.temperature}°C, ${data.humidity}%` : label;
            }}/>} />
            <Area
              dataKey="temperature"
              type="monotone"
              fill="url(#fillTemperature)"
              stroke="var(--color-temperature)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

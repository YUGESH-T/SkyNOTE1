import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import type { WeatherData } from "@/lib/weather-data";
import WeatherIcon from "./weather-icon";

interface InteractiveHourlyForecastProps {
  data: WeatherData;
}

const chartConfig = {
  temperature: {
    label: "Temperature",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function InteractiveHourlyForecast({ data }: InteractiveHourlyForecastProps) {
  const chartData = data.hourly.map(item => ({
    time: item.time,
    temperature: item.temperature,
    condition: item.condition,
  }));

  return (
    <Card className="bg-black/20 backdrop-blur-xl border-white/10 shadow-lg transition-all duration-300 ease-in-out">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">24-Hour Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[150px] w-full">
          <AreaChart
            data={chartData}
            margin={{
              left: -20,
              right: 10,
              top: 10,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-temperature)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--color-temperature)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsla(var(--foreground), 0.1)" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value, index) => index % 2 === 0 ? value : ''}
              className="text-xs fill-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}°`}
              className="text-xs fill-muted-foreground"
            />
            <Tooltip
              cursor={{ stroke: 'hsla(var(--foreground), 0.2)', strokeWidth: 1, strokeDasharray: "3 3" }}
              content={({ active, payload, label }) => {
                const dataPoint = payload?.[0]?.payload;
                if (active && dataPoint) {
                  return (
                    <div className="p-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg shadow-lg">
                      <div className="flex flex-col items-center">
                        <p className="text-sm font-semibold">{label}</p>
                        <WeatherIcon condition={dataPoint.condition} className="w-8 h-8 my-1" />
                        <p className="text-lg font-bold">{`${dataPoint.temperature}°C`}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
             <Area type="monotone" dataKey="temperature" stroke="var(--color-temperature)" strokeWidth={2} fillOpacity={1} fill="url(#colorUv)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

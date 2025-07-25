import type { LucideIcon } from 'lucide-react';
import { Sun, Cloud, CloudRain, Snowflake } from 'lucide-react';

export type WeatherCondition = 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy';

export interface WeatherData {
  location: string;
  condition: WeatherCondition;
  temperature: number;
  humidity: number;
  windSpeed: number;
  forecast: Forecast[];
  hourly: HourlyForecast[];
}

export interface Forecast {
  day: string;
  condition: WeatherCondition;
  tempHigh: number;
  tempLow: number;
}

export interface HourlyForecast {
  time: string;
  condition: WeatherCondition;
  temperature: number;
}

export const weatherIcons: Record<WeatherCondition, LucideIcon> = {
  Sunny: Sun,
  Cloudy: Cloud,
  Rainy: CloudRain,
  Snowy: Snowflake,
};

export const locations: WeatherData[] = [
  {
    location: 'New York',
    condition: 'Sunny',
    temperature: 28,
    humidity: 55,
    windSpeed: 10,
    hourly: [
      { time: '3pm', condition: 'Sunny', temperature: 28 },
      { time: '4pm', condition: 'Sunny', temperature: 27 },
      { time: '5pm', condition: 'Sunny', temperature: 26 },
      { time: '6pm', condition: 'Cloudy', temperature: 25 },
      { time: '7pm', condition: 'Cloudy', temperature: 24 },
    ],
    forecast: [
      { day: 'Tue', condition: 'Sunny', tempHigh: 30, tempLow: 22 },
      { day: 'Wed', condition: 'Cloudy', tempHigh: 27, tempLow: 21 },
      { day: 'Thu', condition: 'Rainy', tempHigh: 25, tempLow: 20 },
      { day: 'Fri', condition: 'Sunny', tempHigh: 29, tempLow: 23 },
      { day: 'Sat', condition: 'Sunny', tempHigh: 31, tempLow: 24 },
      { day: 'Sun', condition: 'Cloudy', tempHigh: 28, tempLow: 22 },
      { day: 'Mon', condition: 'Rainy', tempHigh: 26, tempLow: 21 },
    ],
  },
  {
    location: 'London',
    condition: 'Rainy',
    temperature: 17,
    humidity: 80,
    windSpeed: 20,
    hourly: [
      { time: '3pm', condition: 'Rainy', temperature: 17 },
      { time: '4pm', condition: 'Rainy', temperature: 17 },
      { time: '5pm', condition: 'Cloudy', temperature: 16 },
      { time: '6pm', condition: 'Cloudy', temperature: 16 },
      { time: '7pm', condition: 'Cloudy', temperature: 15 },
    ],
    forecast: [
      { day: 'Tue', condition: 'Rainy', tempHigh: 18, tempLow: 14 },
      { day: 'Wed', condition: 'Cloudy', tempHigh: 19, tempLow: 15 },
      { day: 'Thu', condition: 'Rainy', tempHigh: 16, tempLow: 13 },
      { day: 'Fri', condition: 'Cloudy', tempHigh: 20, tempLow: 16 },
      { day: 'Sat', condition: 'Sunny', tempHigh: 21, tempLow: 17 },
      { day: 'Sun', condition: 'Sunny', tempHigh: 22, tempLow: 18 },
      { day: 'Mon', condition: 'Cloudy', tempHigh: 19, tempLow: 16 },
    ],
  },
  {
    location: 'Tokyo',
    condition: 'Cloudy',
    temperature: 22,
    humidity: 70,
    windSpeed: 15,
    hourly: [
      { time: '3pm', condition: 'Cloudy', temperature: 22 },
      { time: '4pm', condition: 'Cloudy', temperature: 22 },
      { time: '5pm', condition: 'Rainy', temperature: 21 },
      { time: '6pm', condition: 'Rainy', temperature: 21 },
      { time: '7pm', condition: 'Cloudy', temperature: 20 },
    ],
    forecast: [
      { day: 'Tue', condition: 'Cloudy', tempHigh: 24, tempLow: 20 },
      { day: 'Wed', condition: 'Rainy', tempHigh: 21, tempLow: 18 },
      { day: 'Thu', condition: 'Sunny', tempHigh: 26, tempLow: 21 },
      { day: 'Fri', condition: 'Cloudy', tempHigh: 23, tempLow: 19 },
      { day: 'Sat', condition: 'Cloudy', tempHigh: 24, tempLow: 20 },
      { day: 'Sun', condition: 'Sunny', tempHigh: 27, tempLow: 22 },
      { day: 'Mon', condition: 'Rainy', tempHigh: 22, tempLow: 19 },
    ],
  },
    {
    location: 'Moscow',
    condition: 'Snowy',
    temperature: -5,
    humidity: 85,
    windSpeed: 18,
    hourly: [
      { time: '3pm', condition: 'Snowy', temperature: -5 },
      { time: '4pm', condition: 'Snowy', temperature: -5 },
      { time: '5pm', condition: 'Snowy', temperature: -6 },
      { time: '6pm', condition: 'Cloudy', temperature: -6 },
      { time: '7pm', condition: 'Cloudy', temperature: -7 },
    ],
    forecast: [
      { day: 'Tue', condition: 'Snowy', tempHigh: -3, tempLow: -8 },
      { day: 'Wed', condition: 'Snowy', tempHigh: -4, tempLow: -9 },
      { day: 'Thu', condition: 'Cloudy', tempHigh: -2, tempLow: -7 },
      { day: 'Fri', condition: 'Snowy', tempHigh: -6, tempLow: -11 },
      { day: 'Sat', condition: 'Snowy', tempHigh: -5, tempLow: -10 },
      { day: 'Sun', condition: 'Cloudy', tempHigh: -3, tempLow: -8 },
      { day: 'Mon', condition: 'Snowy', tempHigh: -7, tempLow: -12 },
    ],
  },
];
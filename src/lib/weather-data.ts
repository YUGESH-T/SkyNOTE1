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
}

export interface Forecast {
  day: string;
  condition: WeatherCondition;
  tempHigh: number;
  tempLow: number;
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
    forecast: [
      { day: 'Tue', condition: 'Sunny', tempHigh: 30, tempLow: 22 },
      { day: 'Wed', condition: 'Cloudy', tempHigh: 27, tempLow: 21 },
      { day: 'Thu', condition: 'Rainy', tempHigh: 25, tempLow: 20 },
      { day: 'Fri', condition: 'Sunny', tempHigh: 29, tempLow: 23 },
    ],
  },
  {
    location: 'London',
    condition: 'Rainy',
    temperature: 17,
    humidity: 80,
    windSpeed: 20,
    forecast: [
      { day: 'Tue', condition: 'Rainy', tempHigh: 18, tempLow: 14 },
      { day: 'Wed', condition: 'Cloudy', tempHigh: 19, tempLow: 15 },
      { day: 'Thu', condition: 'Rainy', tempHigh: 16, tempLow: 13 },
      { day: 'Fri', condition: 'Cloudy', tempHigh: 20, tempLow: 16 },
    ],
  },
  {
    location: 'Tokyo',
    condition: 'Cloudy',
    temperature: 22,
    humidity: 70,
    windSpeed: 15,
    forecast: [
      { day: 'Tue', condition: 'Cloudy', tempHigh: 24, tempLow: 20 },
      { day: 'Wed', condition: 'Rainy', tempHigh: 21, tempLow: 18 },
      { day: 'Thu', condition: 'Sunny', tempHigh: 26, tempLow: 21 },
      { day: 'Fri', condition: 'Cloudy', tempHigh: 23, tempLow: 19 },
    ],
  },
    {
    location: 'Moscow',
    condition: 'Snowy',
    temperature: -5,
    humidity: 85,
    windSpeed: 18,
    forecast: [
      { day: 'Tue', condition: 'Snowy', tempHigh: -3, tempLow: -8 },
      { day: 'Wed', condition: 'Snowy', tempHigh: -4, tempLow: -9 },
      { day: 'Thu', condition: 'Cloudy', tempHigh: -2, tempLow: -7 },
      { day: 'Fri', condition: 'Snowy', tempHigh: -6, tempLow: -11 },
    ],
  },
];

import type { LucideIcon } from 'lucide-react';
import { Sun, Cloud, CloudRain, Snowflake } from 'lucide-react';

export type WeatherCondition = 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy';

export interface WeatherData {
  location: string;
  condition: WeatherCondition;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  sunrise: string;
  sunset: string;
  currentTime: string;
  forecast: Forecast[];
  hourly: HourlyForecast[];
}

export interface Forecast {
  day: string;
  condition: WeatherCondition;
  tempHigh: number;
  tempLow: number;
  humidity: number;
}

export interface HourlyForecast {
  time: string;
  condition: WeatherCondition;
  temperature: number;
  windSpeed: number;
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
    feelsLike: 30,
    humidity: 55,
    windSpeed: 10,
    sunrise: "06:00",
    sunset: "20:30",
    currentTime: "15:00",
    hourly: [
      { time: '3pm', condition: 'Sunny', temperature: 28, windSpeed: 12 },
      { time: '4pm', condition: 'Sunny', temperature: 27, windSpeed: 11 },
      { time: '5pm', condition: 'Sunny', temperature: 26, windSpeed: 10 },
      { time: '6pm', condition: 'Cloudy', temperature: 25, windSpeed: 9 },
      { time: '7pm', condition: 'Cloudy', temperature: 24, windSpeed: 8 },
      { time: '8pm', condition: 'Cloudy', temperature: 23, windSpeed: 9 },
      { time: '9pm', condition: 'Cloudy', temperature: 22, windSpeed: 10 },
      { time: '10pm', condition: 'Cloudy', temperature: 22, windSpeed: 11 },
      { time: '11pm', condition: 'Rainy', temperature: 21, windSpeed: 12 },
      { time: '12am', condition: 'Rainy', temperature: 21, windSpeed: 13 },
      { time: '1am', condition: 'Rainy', temperature: 20, windSpeed: 14 },
      { time: '2am', condition: 'Rainy', temperature: 20, windSpeed: 13 },
    ],
    forecast: [
      { day: 'Tue', condition: 'Sunny', tempHigh: 30, tempLow: 22, humidity: 55 },
      { day: 'Wed', condition: 'Cloudy', tempHigh: 27, tempLow: 21, humidity: 60 },
      { day: 'Thu', condition: 'Rainy', tempHigh: 25, tempLow: 20, humidity: 75 },
      { day: 'Fri', condition: 'Sunny', tempHigh: 29, tempLow: 23, humidity: 50 },
      { day: 'Sat', condition: 'Sunny', tempHigh: 31, tempLow: 24, humidity: 48 },
      { day: 'Sun', condition: 'Cloudy', tempHigh: 28, tempLow: 22, humidity: 62 },
      { day: 'Mon', condition: 'Rainy', tempHigh: 26, tempLow: 21, humidity: 80 },
    ],
  },
];

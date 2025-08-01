
'use server';

/**
 * @fileOverview Retrieves weather data for a specified location from the OpenWeatherMap API.
 *
 * - getWeatherData - A function that fetches weather data for a given location.
 * - GetWeatherDataInput - The input type for the getWeatherData function.
 * - GetWeatherDataOutput - The return type for the getWeatherData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format } from 'date-fns';

const GetWeatherDataInputSchema = z.object({
  location: z.string().optional().describe('The city name to get weather data for (e.g., "London").'),
  lat: z.number().optional().describe('The latitude.'),
  lon: z.number().optional().describe('The longitude.'),
}).refine(data => data.location || (typeof data.lat === 'number' && typeof data.lon === 'number'), {
    message: "Either location or both lat and lon must be provided.",
});
export type GetWeatherDataInput = z.infer<typeof GetWeatherDataInputSchema>;

const DailyDataSchema = z.object({
    day: z.string().describe("Day of the week (e.g., 'Tue')."),
    condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Thunderstorm']),
    tempHigh: z.number().describe("Highest temperature for the day in Celsius."),
    tempLow: z.number().describe("Lowest temperature for the day in Celsius."),
    humidity: z.number().describe("Average humidity percentage for the day."),
});

const GetWeatherDataOutputSchema = z.object({
    location: z.string(),
    condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Thunderstorm']),
    temperature: z.number().describe("Temperature in Celsius."),
    feelsLike: z.number().describe("The 'feels like' temperature in Celsius, considering factors like humidity and wind."),
    humidity: z.number().describe("Humidity percentage."),
    windSpeed: z.number().describe("Wind speed in km/h."),
    sunrise: z.string().describe("Sunrise time (e.g., '6:30 AM')."),
    sunset: z.string().describe("Sunset time (e.g., '7:45 PM')."),
    currentTime: z.string().describe("Current local time (e.g., '2:30 PM')."),
    forecast: z.array(DailyDataSchema).describe("A 7-day weather forecast."),
    hourly: z.array(z.object({
        time: z.string().describe("The hour for the forecast (e.g., '3pm')."),
        condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Thunderstorm']),
        temperature: z.number().describe("Temperature for the hour in Celsius."),
        windSpeed: z.number().describe("Wind speed in km/h for the hour."),
        humidity: z.number().describe("Humidity percentage for the hour."),
    })).describe("A 24-hour weather forecast."),
});
export type GetWeatherDataOutput = z.infer<typeof GetWeatherDataOutputSchema>;

export async function getWeatherData(input: GetWeatherDataInput): Promise<GetWeatherDataOutput> {
  return getWeatherDataFlow(input);
}

function mapWeatherCondition(main: string): 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Thunderstorm' {
    const mapping: Record<string, 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Thunderstorm'> = {
        'Clear': 'Sunny',
        'Clouds': 'Cloudy',
        'Rain': 'Rainy',
        'Drizzle': 'Rainy',
        'Snow': 'Snowy',
        'Thunderstorm': 'Thunderstorm',
        'Mist': 'Cloudy',
        'Fog': 'Cloudy',
        'Haze': 'Cloudy'
    };
    return mapping[main] || 'Sunny';
}

function formatTimeFromTimestamp(timestamp: number, timezoneOffset: number, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    const defaultOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
    };
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
  } catch (e) {
    console.error('Error formatting time:', e);
    return 'N/A';
  }
}

const getWeatherDataFlow = ai.defineFlow(
  {
    name: 'getWeatherDataFlow',
    inputSchema: GetWeatherDataInputSchema,
    outputSchema: GetWeatherDataOutputSchema,
  },
  async ({ location, lat, lon }) => {
    const apiKey = "888c6f6d1a152bfd3be977d295ab111f";
    
    let query = '';
    if (location) {
      query = `q=${location}`;
    } else if (lat !== undefined && lon !== undefined) {
      query = `lat=${lat}&lon=${lon}`;
    } else {
      throw new Error("Either location or both lat and lon must be provided.");
    }
    
    // Fetch current weather data
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?${query}&appid=${apiKey}&units=metric`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
        const errorBody = await weatherResponse.text();
        throw new Error(`OpenWeather Weather API request failed with status ${weatherResponse.status}: ${errorBody}`);
    }
    const currentData = await weatherResponse.json();
    const timezoneOffset = currentData.timezone;


    // Fetch forecast data
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?${query}&appid=${apiKey}&units=metric`;
    const forecastResponse = await fetch(forecastUrl);
     if (!forecastResponse.ok) {
        const errorBody = await forecastResponse.text();
        throw new Error(`OpenWeather Forecast API request failed with status ${forecastResponse.status}: ${errorBody}`);
    }
    const forecastData = await forecastResponse.json();

    const hourly = forecastData.list.slice(0, 8).map((h: any) => ({
        time: formatTimeFromTimestamp(h.dt, timezoneOffset, { hour: 'numeric', minute: '2-digit', hour12: true }),
        condition: mapWeatherCondition(h.weather[0].main),
        temperature: Math.round(h.main.temp),
        windSpeed: Math.round(h.wind.speed * 3.6),
        humidity: Math.round(h.main.humidity),
    }));
    
    const dailyForecasts: { [key: string]: { temps: number[], humidities: number[], conditions: string[] } } = {};

    forecastData.list.forEach((item: any) => {
      const day = format(new Date(item.dt * 1000), 'EEE');
      if (!dailyForecasts[day]) {
        dailyForecasts[day] = { temps: [], humidities: [], conditions: [] };
      }
      dailyForecasts[day].temps.push(item.main.temp);
      dailyForecasts[day].humidities.push(item.main.humidity);
      dailyForecasts[day].conditions.push(item.weather[0].main);
    });

    const forecast = Object.keys(dailyForecasts).slice(0, 7).map(day => {
      const dayData = dailyForecasts[day];
      const mostCommonCondition = dayData.conditions.sort((a,b) =>
            dayData.conditions.filter(v => v===a).length
          - dayData.conditions.filter(v => v===b).length
      ).pop()!;
      
      return {
        day: day,
        condition: mapWeatherCondition(mostCommonCondition),
        tempHigh: Math.round(Math.max(...dayData.temps)),
        tempLow: Math.round(Math.min(...dayData.temps)),
        humidity: Math.round(dayData.humidities.reduce((a, b) => a + b, 0) / dayData.humidities.length),
      };
    });
     
    const transformedData: GetWeatherDataOutput = {
        location: currentData.name,
        condition: mapWeatherCondition(currentData.weather[0].main),
        temperature: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: Math.round(currentData.main.humidity),
        windSpeed: Math.round(currentData.wind.speed * 3.6),
        sunrise: formatTimeFromTimestamp(currentData.sys.sunrise, timezoneOffset),
        sunset: formatTimeFromTimestamp(currentData.sys.sunset, timezoneOffset),
        currentTime: formatTimeFromTimestamp(currentData.dt, timezoneOffset),
        forecast: forecast,
        hourly: hourly,
    };

    return transformedData;
  }
);

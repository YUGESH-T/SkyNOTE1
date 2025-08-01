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
    day: z.string().describe("Day of the week (e.g., 'Tue') or date."),
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
    history: z.array(DailyDataSchema).describe("A 5-day historical weather data."),
    hourly: z.array(z.object({
        time: z.string().describe("The hour for the forecast (e.g., '3pm')."),
        condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Thunderstorm']),
        temperature: z.number().describe("Temperature for the hour in Celsius."),
        windSpeed: z.number().describe("Wind speed in km/h for the hour."),
        humidity: z.number().describe("Humidity percentage for the hour."),
    })).describe("A 24-hour weather forecast."),
});
export type GetWeatherDataOutput = z.infer<typeof GetWeatherDataOutputSchema>;

function mapWeatherCondition(iconCode: string): 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Thunderstorm' {
    const mapping: Record<string, 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Thunderstorm'> = {
        '01d': 'Sunny', '01n': 'Sunny',
        '02d': 'Cloudy', '02n': 'Cloudy',
        '03d': 'Cloudy', '03n': 'Cloudy',
        '04d': 'Cloudy', '04n': 'Cloudy',
        '09d': 'Rainy', '09n': 'Rainy',
        '10d': 'Rainy', '10n': 'Rainy',
        '11d': 'Thunderstorm', '11n': 'Thunderstorm',
        '13d': 'Snowy', '13n': 'Snowy',
        '50d': 'Cloudy', '50n': 'Cloudy' // Mist/fog as cloudy
    };
    return mapping[iconCode] || 'Sunny';
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

async function fetchFromOpenWeather(params: Record<string, string>) {
    const apiKey = '888c6f6d1a152bfd3be977d295ab111f';
    const endpoint = 'data/2.5/weather';
    
    const url = new URL(`https://api.openweathermap.org/${endpoint}`);
    url.searchParams.append('appid', apiKey);
    url.searchParams.append('units', 'metric');
    for (const key in params) {
        url.searchParams.append(key, params[key]);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenWeather API request failed for endpoint '${endpoint}' with status ${response.status}: ${errorBody}`);
    }
    return response.json();
}

const getWeatherDataFlow = ai.defineFlow(
  {
    name: 'getWeatherDataFlow',
    inputSchema: GetWeatherDataInputSchema,
    outputSchema: GetWeatherDataOutputSchema,
  },
  async ({ location, lat, lon }) => {
    let params: Record<string, string> = {};

    if (location) {
        params['q'] = location;
    } else if (lat !== undefined && lon !== undefined) {
        params['lat'] = lat.toString();
        params['lon'] = lon.toString();
    } else {
        throw new Error("Either location or lat/lon must be provided.");
    }
    
    const weatherData = await fetchFromOpenWeather(params);
    
    const timezoneOffset = weatherData.timezone;

    // Placeholder data for forecast and hourly as the /weather endpoint doesn't provide it.
    const placeholderDaily: GetWeatherDataOutput['forecast'] = Array(7).fill(null).map((_, i) => ({
      day: format(new Date(Date.now() + (i + 1) * 86400000), 'EEE'),
      condition: 'Sunny',
      tempHigh: 0,
      tempLow: 0,
      humidity: 0,
    }));

    const placeholderHourly: GetWeatherDataOutput['hourly'] = Array(24).fill(null).map((_, i) => ({
        time: `${(i % 12) + 1}${i < 12 ? 'am' : 'pm'}`,
        condition: 'Sunny',
        temperature: 0,
        windSpeed: 0,
        humidity: 0,
    }));

    const transformedData: GetWeatherDataOutput = {
        location: weatherData.name,
        condition: mapWeatherCondition(weatherData.weather[0].icon),
        temperature: Math.round(weatherData.main.temp),
        feelsLike: Math.round(weatherData.main.feels_like),
        humidity: Math.round(weatherData.main.humidity),
        windSpeed: Math.round(weatherData.wind.speed * 3.6), // m/s to km/h
        sunrise: formatTimeFromTimestamp(weatherData.sys.sunrise, timezoneOffset),
        sunset: formatTimeFromTimestamp(weatherData.sys.sunset, timezoneOffset),
        currentTime: formatTimeFromTimestamp(weatherData.dt, timezoneOffset),
        forecast: placeholderDaily,
        history: [], // This endpoint does not provide historical data.
        hourly: placeholderHourly,
    };
    
    return transformedData;
  }
);

export async function getWeatherData(input: GetWeatherDataInput): Promise<GetWeatherDataOutput> {
  return getWeatherDataFlow(input);
}

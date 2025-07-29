
'use server';

/**
 * @fileOverview Retrieves weather data for a specified location from the Weatherbit API.
 *
 * - getWeatherData - A function that fetches weather data for a given location.
 * - GetWeatherDataInput - The input type for the getWeatherData function.
 * - GetWeatherDataOutput - The return type for the getWeatherData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetWeatherDataInputSchema = z.object({
  location: z.string().optional().describe('The city name to get weather data for (e.g., "London").'),
  lat: z.number().optional().describe('The latitude.'),
  lon: z.number().optional().describe('The longitude.'),
}).refine(data => data.location || (typeof data.lat === 'number' && typeof data.lon === 'number'), {
    message: "Either location or both lat and lon must be provided.",
});
export type GetWeatherDataInput = z.infer<typeof GetWeatherDataInputSchema>;

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
    forecast: z.array(z.object({
        day: z.string().describe("Day of the week (e.g., 'Tue')."),
        condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Thunderstorm']),
        tempHigh: z.number().describe("Highest temperature for the day in Celsius."),
        tempLow: z.number().describe("Lowest temperature for the day in Celsius."),
        humidity: z.number().describe("Average humidity percentage for the day."),
    })).length(7).describe("A 7-day weather forecast."),
    hourly: z.array(z.object({
        time: z.string().describe("The hour for the forecast (e.g., '3pm')."),
        condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Thunderstorm']),
        temperature: z.number().describe("Temperature for the hour in Celsius."),
        windSpeed: z.number().describe("Wind speed in km/h for the hour."),
        humidity: z.number().describe("Humidity percentage for the hour."),
    })).length(24).describe("A 24-hour weather forecast."),
});
export type GetWeatherDataOutput = z.infer<typeof GetWeatherDataOutputSchema>;

function mapWeatherCondition(weatherbitCode: number): 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Thunderstorm' {
    if (weatherbitCode >= 200 && weatherbitCode <= 233) return 'Thunderstorm';
    if (weatherbitCode >= 801 && weatherbitCode <= 804) return 'Cloudy';
    if (weatherbitCode === 800) return 'Sunny';
    if (weatherbitCode >= 600 && weatherbitCode <= 623) return 'Snowy';
    if (weatherbitCode >= 300 && weatherbitCode <= 522) return 'Rainy';
    return 'Sunny'; // Default
}

function formatTimeFromTimestamp(timestamp: number, timezone: string): string {
  try {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    }).format(date);
  } catch (e) {
    if (e instanceof RangeError) {
      console.warn(`Invalid timezone '${timezone}'. Formatting with system default.`);
      // Fallback for invalid timezone identifiers
      const date = new Date(timestamp * 1000);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    console.error('Error formatting time:', e);
    return 'N/A';
  }
}

async function fetchFromWeatherbit(endpoint: string, params: Record<string, string>) {
    const apiKey = process.env.WEATHERBIT_API_KEY;
    if (!apiKey) {
        throw new Error('WEATHERBIT_API_KEY is not set. Please add it to your .env file.');
    }
    const url = new URL(`https://api.weatherbit.io/v2.0/${endpoint}`);
    url.searchParams.append('key', apiKey);
    for (const key in params) {
        url.searchParams.append(key, params[key]);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Weatherbit API request failed for endpoint '${endpoint}' with status ${response.status}: ${errorBody}`);
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
    
    const queryParams: Record<string, string> = {};
    if (location) {
        queryParams.city = location;
    } else if (typeof lat === 'number' && typeof lon === 'number') {
        queryParams.lat = lat.toString();
        queryParams.lon = lon.toString();
    }

    const [currentData, forecastData, hourlyData] = await Promise.all([
        fetchFromWeatherbit('current', queryParams),
        fetchFromWeatherbit('forecast/daily', { ...queryParams, days: '7' }),
        fetchFromWeatherbit('forecast/hourly', { ...queryParams, hours: '24' })
    ]);

    if (!currentData.data || currentData.data.length === 0) {
        throw new Error(`No current weather data found for the specified location.`);
    }

    const current = currentData.data[0];
    const forecast = forecastData.data;
    const hourly = hourlyData.data;

    // Fetch sunrise/sunset data from the new API
    const sunriseSunsetResponse = await fetch(`https://api.sunrise-sunset.org/json?lat=${current.lat}&lng=${current.lon}&formatted=0`);
    if (!sunriseSunsetResponse.ok) {
        throw new Error(`Sunrise-Sunset API request failed with status ${sunriseSunsetResponse.status}`);
    }
    const sunriseSunsetData = await sunriseSunsetResponse.json();

    if (sunriseSunsetData.status !== 'OK') {
        throw new Error(`Sunrise-Sunset API returned status ${sunriseSunsetData.status}`);
    }

    const sunriseDate = new Date(sunriseSunsetData.results.sunrise);
    const sunsetDate = new Date(sunriseSunsetData.results.sunset);
    
    const timezone = current.timezone;

    const sunriseTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone }).format(sunriseDate);
    const sunsetTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone }).format(sunsetDate);


    const transformedData: GetWeatherDataOutput = {
        location: current.city_name,
        condition: mapWeatherCondition(current.weather.code),
        temperature: Math.round(current.temp),
        feelsLike: Math.round(current.app_temp),
        humidity: Math.round(current.rh),
        windSpeed: Math.round(current.wind_spd * 3.6),
        sunrise: sunriseTime,
        sunset: sunsetTime,
        currentTime: formatTimeFromTimestamp(current.ts, current.timezone),
        forecast: forecast.map((day: any) => ({
            day: new Date(day.valid_date).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
            condition: mapWeatherCondition(day.weather.code),
            tempHigh: Math.round(day.high_temp),
            tempLow: Math.round(day.low_temp),
            humidity: Math.round(day.rh),
        })),
        hourly: hourly.map((hour: any) => ({
            time: formatTimeFromTimestamp(hour.ts, hourlyData.timezone),
            condition: mapWeatherCondition(hour.weather.code),
            temperature: Math.round(hour.temp),
            windSpeed: Math.round(hour.wind_spd * 3.6),
            humidity: Math.round(hour.rh),
        })).slice(0, 24),
    };
    
    return transformedData;
  }
);

export async function getWeatherData(input: GetWeatherDataInput): Promise<GetWeatherDataOutput> {
  return getWeatherDataFlow(input);
}

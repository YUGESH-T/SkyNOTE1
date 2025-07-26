'use server';

/**
 * @fileOverview Retrieves weather data for a specified location from the Weatherbit API.
 *
 * - getWeatherData - A function that fetches weather data for a given location.
 * - GetWeatherDataInput - The input type for the getWeatherData function.
 * - GetWeatherDataOutput - The return type for the getWeatherData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
    sunrise: z.string().describe("Sunrise time (e.g., '06:30')."),
    sunset: z.string().describe("Sunset time (e.g., '19:45')."),
    currentTime: z.string().describe("Current local time (e.g., '14:30')."),
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
    })).min(1).describe("A 24-hour weather forecast."),
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
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
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

    const transformedData: GetWeatherDataOutput = {
        location: current.city_name,
        condition: mapWeatherCondition(current.weather.code),
        temperature: Math.round(current.temp),
        feelsLike: Math.round(current.app_temp),
        humidity: Math.round(current.rh),
        windSpeed: Math.round(current.wind_spd * 3.6),
        sunrise: formatTimeFromTimestamp(current.sunrise_ts, current.timezone),
        sunset: formatTimeFromTimestamp(current.sunset_ts, current.timezone),
        currentTime: formatTimeFromTimestamp(current.ts, current.timezone),
        forecast: forecast.map((day: any) => ({
            day: new Date(day.valid_date).toLocaleDateString('en-US', { weekday: 'short' }),
            condition: mapWeatherCondition(day.weather.code),
            tempHigh: Math.round(day.high_temp),
            tempLow: Math.round(day.low_temp),
            humidity: Math.round(day.rh),
        })),
        hourly: hourly.map((hour: any) => ({
            time: new Date(hour.timestamp_local).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).toLowerCase(),
            condition: mapWeatherCondition(hour.weather.code),
            temperature: Math.round(hour.temp),
            windSpeed: Math.round(hour.wind_spd * 3.6),
        })).slice(0, 24),
    };
    
    return transformedData;
  }
);

export async function getWeatherData(input: GetWeatherDataInput): Promise<GetWeatherDataOutput> {
  return getWeatherDataFlow(input);
}

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
  location: z.string().describe('The city name to get weather data for (e.g., "London").'),
});
export type GetWeatherDataInput = z.infer<typeof GetWeatherDataInputSchema>;

const GetWeatherDataOutputSchema = z.object({
    location: z.string(),
    condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy']),
    temperature: z.number().describe("Temperature in Celsius."),
    feelsLike: z.number().describe("The 'feels like' temperature in Celsius, considering factors like humidity and wind."),
    humidity: z.number().describe("Humidity percentage."),
    windSpeed: z.number().describe("Wind speed in km/h."),
    forecast: z.array(z.object({
        day: z.string().describe("Day of the week (e.g., 'Tue')."),
        condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy']),
        tempHigh: z.number().describe("Highest temperature for the day in Celsius."),
        tempLow: z.number().describe("Lowest temperature for the day in Celsius."),
    })).length(7).describe("A 7-day weather forecast."),
    hourly: z.array(z.object({
        time: z.string().describe("The hour for the forecast (e.g., '3pm')."),
        condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy']),
        temperature: z.number().describe("Temperature for the hour in Celsius."),
    })).length(5).describe("A 5-hour weather forecast."),
});
export type GetWeatherDataOutput = z.infer<typeof GetWeatherDataOutputSchema>;

function mapWeatherCondition(weatherbitCode: number): 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' {
    if (weatherbitCode >= 801 && weatherbitCode <= 804) return 'Cloudy';
    if (weatherbitCode === 800) return 'Sunny';
    if (weatherbitCode >= 600 && weatherbitCode <= 623) return 'Snowy';
    if (weatherbitCode >= 200 && weatherbitCode <= 522) return 'Rainy';
    return 'Sunny'; // Default
}

async function fetchFromWeatherbit(endpoint: string, params: Record<string, string>) {
    const apiKey = process.env.WEATHERBIT_API_KEY;
    if (!apiKey) {
        throw new Error('WEATHERBIT_API_KEY is not set in the environment variables.');
    }
    const url = new URL(`https://api.weatherbit.io/v2.0/${endpoint}`);
    url.searchParams.append('key', apiKey);
    for (const key in params) {
        url.searchParams.append(key, params[key]);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Weatherbit API request failed with status ${response.status}: ${await response.text()}`);
    }
    return response.json();
}

const getWeatherDataFlow = ai.defineFlow(
  {
    name: 'getWeatherDataFlow',
    inputSchema: GetWeatherDataInputSchema,
    outputSchema: GetWeatherDataOutputSchema,
  },
  async ({ location }) => {
    
    const [currentData, forecastData, hourlyData] = await Promise.all([
        fetchFromWeatherbit('current', { city: location }),
        fetchFromWeatherbit('forecast/daily', { city: location, days: '7' }),
        fetchFromWeatherbit('forecast/hourly', { city: location, hours: '5' })
    ]);

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
        forecast: forecast.map((day: any) => ({
            day: new Date(day.valid_date).toLocaleDateString('en-US', { weekday: 'short' }),
            condition: mapWeatherCondition(day.weather.code),
            tempHigh: Math.round(day.high_temp),
            tempLow: Math.round(day.low_temp),
        })),
        hourly: hourly.map((hour: any) => ({
            time: new Date(hour.timestamp_local).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).toLowerCase(),
            condition: mapWeatherCondition(hour.weather.code),
            temperature: Math.round(hour.temp),
        })).slice(0, 5),
    };
    
    return transformedData;
  }
);

export async function getWeatherData(input: GetWeatherDataInput): Promise<GetWeatherDataOutput> {
  return getWeatherDataFlow(input);
}

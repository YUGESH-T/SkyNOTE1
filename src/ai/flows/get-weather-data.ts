'use server';

/**
 * @fileOverview Retrieves weather data for a specified location.
 *
 * - getWeatherData - A function that fetches weather data for a given location.
 * - GetWeatherDataInput - The input type for the getWeatherData function.
 * - GetWeatherDataOutput - The return type for the getWeatherData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { WeatherCondition, WeatherData, Forecast, HourlyForecast, locations } from '@/lib/weather-data';

const GetWeatherDataInputSchema = z.object({
  location: z.string().describe('The city name to get weather data for (e.g., "London").'),
});
export type GetWeatherDataInput = z.infer<typeof GetWeatherDataInputSchema>;

const weatherConditions: WeatherCondition[] = ['Sunny', 'Cloudy', 'Rainy', 'Snowy'];
const days = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];

// Helper function to generate random weather data for a location
function generateRandomWeatherData(location: string): WeatherData {
    const condition: WeatherCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const temperature = Math.floor(Math.random() * 40) - 5; // -5 to 35
    
    const forecast: Forecast[] = days.map(day => ({
        day,
        condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
        tempHigh: temperature + Math.floor(Math.random() * 5),
        tempLow: temperature - Math.floor(Math.random() * 5),
    }));

    const hourly: HourlyForecast[] = [
        { time: '3pm', condition, temperature },
        { time: '4pm', condition, temperature: temperature - 1 },
        { time: '5pm', condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)], temperature: temperature - 1 },
        { time: '6pm', condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)], temperature: temperature - 2 },
        { time: '7pm', condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)], temperature: temperature - 3 },
    ];

    return {
        location,
        condition,
        temperature,
        humidity: Math.floor(Math.random() * 50) + 50, // 50-100
        windSpeed: Math.floor(Math.random() * 25) + 5, // 5-30
        forecast,
        hourly,
    };
}


const GetWeatherDataOutputSchema = z.object({
    location: z.string(),
    condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy']),
    temperature: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    forecast: z.array(z.object({
        day: z.string(),
        condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy']),
        tempHigh: z.number(),
        tempLow: z.number(),
    })),
    hourly: z.array(z.object({
        time: z.string(),
        condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy']),
        temperature: z.number(),
    })),
});
export type GetWeatherDataOutput = z.infer<typeof GetWeatherDataOutputSchema>;

export async function getWeatherData(input: GetWeatherDataInput): Promise<GetWeatherDataOutput> {
  return getWeatherDataFlow(input);
}

const getWeatherDataFlow = ai.defineFlow(
  {
    name: 'getWeatherDataFlow',
    inputSchema: GetWeatherDataInputSchema,
    outputSchema: GetWeatherDataOutputSchema,
  },
  async ({ location }) => {
    const existingLocation = locations.find(l => l.location.toLowerCase() === location.toLowerCase());
    if (existingLocation) {
        return existingLocation;
    }
    
    // In a real application, you would call a weather API here.
    // For this example, we will generate random data if location is not found.
    return generateRandomWeatherData(location);
  }
);

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

export async function getWeatherData(input: GetWeatherDataInput): Promise<GetWeatherDataOutput> {
  return getWeatherDataFlow(input);
}

const prompt = ai.definePrompt({
    name: 'getWeatherDataPrompt',
    input: { schema: GetWeatherDataInputSchema.extend({ currentDate: z.string() }) },
    output: { schema: GetWeatherDataOutputSchema },
    prompt: `You are a weather API. Given a location, provide the current weather, a 'feels like' temperature, a 5-hour forecast, and a 7-day forecast.
The current date is {{{currentDate}}}. Use this to generate a realistic forecast starting from today.
Location: {{{location}}}`,
});

const getWeatherDataFlow = ai.defineFlow(
  {
    name: 'getWeatherDataFlow',
    inputSchema: GetWeatherDataInputSchema,
    outputSchema: GetWeatherDataOutputSchema,
  },
  async (input) => {
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const { output } = await prompt({ ...input, currentDate });
    return output!;
  }
);

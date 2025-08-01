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

async function fetchFromOpenWeather(endpoint: string, params: Record<string, string>) {
    const apiKey = "888c6f6d1a152bfd3be977d295ab111f";
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
    
    let queryParams: { q?: string; lat?: string; lon?: string } = {};
    if (location) {
        queryParams.q = location;
    } else if (lat !== undefined && lon !== undefined) {
        queryParams.lat = lat.toString();
        queryParams.lon = lon.toString();
    } else {
        throw new Error("Either location or lat/lon must be provided.");
    }
    
    const currentWeatherData = await fetchFromOpenWeather('data/2.5/weather', queryParams as Record<string, string>);
    
    const forecastParams = { ...queryParams };
    if (!forecastParams.q) {
        forecastParams.lat = currentWeatherData.coord.lat.toString();
        forecastParams.lon = currentWeatherData.coord.lon.toString();
    }

    const forecastData = await fetchFromOpenWeather('data/2.5/forecast', forecastParams as Record<string, string>);

    const timezoneOffset = currentWeatherData.timezone;

    const today = new Date();
    today.setSeconds(today.getSeconds() + timezoneOffset);
    const todayDate = today.getUTCDate();

    const hourly = forecastData.list
        .map((h: any) => {
            const itemDate = new Date((h.dt + timezoneOffset) * 1000);
            return {
                date: itemDate,
                dayOfMonth: itemDate.getUTCDate(),
                time: formatTimeFromTimestamp(h.dt, timezoneOffset, { hour: 'numeric', hour12: true }),
                condition: mapWeatherCondition(h.weather[0].main),
                temperature: Math.round(h.main.temp),
                windSpeed: Math.round(h.wind.speed * 3.6),
                humidity: Math.round(h.main.humidity),
            };
        })
        .filter((h: any) => h.dayOfMonth === todayDate || h.dayOfMonth === todayDate + 1);


    const dailyForecasts: Record<string, { temps: number[], humidities: number[], conditions: string[] }> = {};

    forecastData.list.forEach((item: any) => {
        const day = format(new Date(item.dt * 1000), 'EEE');
        if (!dailyForecasts[day]) {
            dailyForecasts[day] = { temps: [], humidities: [], conditions: [] };
        }
        dailyForecasts[day].temps.push(item.main.temp);
        dailyForecasts[day].humidities.push(item.main.humidity);
        dailyForecasts[day].conditions.push(item.weather[0].main);
    });

    const forecast: DailyData[] = Object.keys(dailyForecasts).slice(0, 7).map(day => {
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
            humidity: Math.round(dayData.humidities.reduce((a, b) => a + b) / dayData.humidities.length),
        };
    });


    const transformedData: GetWeatherDataOutput = {
        location: currentWeatherData.name,
        condition: mapWeatherCondition(currentWeatherData.weather[0].main),
        temperature: Math.round(currentWeatherData.main.temp),
        feelsLike: Math.round(currentWeatherData.main.feels_like),
        humidity: Math.round(currentWeatherData.main.humidity),
        windSpeed: Math.round(currentWeatherData.wind.speed * 3.6),
        sunrise: formatTimeFromTimestamp(currentWeatherData.sys.sunrise, timezoneOffset),
        sunset: formatTimeFromTimestamp(currentWeatherData.sys.sunset, timezoneOffset),
        currentTime: formatTimeFromTimestamp(currentWeatherData.dt, timezoneOffset),
        forecast: forecast,
        hourly: hourly,
    };

    return transformedData;
  }
);

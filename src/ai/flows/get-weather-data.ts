
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
    forecast: z.array(DailyDataSchema).length(7).describe("A 7-day weather forecast."),
    history: z.array(DailyDataSchema).describe("A 5-day historical weather data."),
    hourly: z.array(z.object({
        time: z.string().describe("The hour for the forecast (e.g., '3pm')."),
        condition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Thunderstorm']),
        temperature: z.number().describe("Temperature for the hour in Celsius."),
        windSpeed: z.number().describe("Wind speed in km/h for the hour."),
        humidity: z.number().describe("Humidity percentage for the hour."),
    })).length(24).describe("A 24-hour weather forecast."),
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

function formatTimeFromTimestamp(timestamp: number, timezone: string, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = new Date(timestamp * 1000);
    const defaultOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
    };
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
  } catch (e) {
    if (e instanceof RangeError) {
      console.warn(`Invalid timezone '${timezone}'. Formatting with server's local time.`);
      const date = new Date(timestamp * 1000);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    console.error('Error formatting time:', e);
    return 'N/A';
  }
}

async function fetchFromOpenWeather(endpoint: string, params: Record<string, string>) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENWEATHER_API_KEY is not set. Please add it to your .env file.');
    }
    const url = new URL(`https://api.openweathermap.org/${endpoint}`);
    url.searchParams.append('appid', apiKey);
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
    let cityLat = lat;
    let cityLon = lon;
    let cityName = location;

    if (location) {
        const geocodingData = await fetchFromOpenWeather('geo/1.0/direct', { q: location, limit: '1' });
        if (!geocodingData || geocodingData.length === 0) {
            throw new Error(`Could not find location: ${location}`);
        }
        cityLat = geocodingData[0].lat;
        cityLon = geocodingData[0].lon;
        cityName = geocodingData[0].name;
    }

    if (cityLat === undefined || cityLon === undefined) {
         throw new Error('Latitude and Longitude must be provided.');
    }

    // OpenWeather One Call API provides current, hourly and daily forecasts
    const weatherData = await fetchFromOpenWeather('data/3.0/onecall', {
        lat: cityLat.toString(),
        lon: cityLon.toString(),
        units: 'metric', // For Celsius
        exclude: 'minutely,alerts'
    });
    
    if (!cityName) {
        const reverseGeocoding = await fetchFromOpenWeather('geo/1.0/reverse', {
            lat: cityLat.toString(),
            lon: cityLon.toString(),
            limit: '1',
        });
        if(reverseGeocoding && reverseGeocoding.length > 0) {
            cityName = reverseGeocoding[0].name;
        } else {
            cityName = "Current Location";
        }
    }
    
    const timezone = weatherData.timezone;
    const current = weatherData.current;
    const daily = weatherData.daily;
    const hourly = weatherData.hourly;

    const transformDailyData = (day: any, index: number): DailyData => ({
        day: formatTimeFromTimestamp(day.dt, timezone, { weekday: 'short' }),
        condition: mapWeatherCondition(day.weather[0].icon),
        tempHigh: Math.round(day.temp.max),
        tempLow: Math.round(day.temp.min),
        humidity: Math.round(day.humidity),
    });

    const transformedData: GetWeatherDataOutput = {
        location: cityName,
        condition: mapWeatherCondition(current.weather[0].icon),
        temperature: Math.round(current.temp),
        feelsLike: Math.round(current.feels_like),
        humidity: Math.round(current.humidity),
        windSpeed: Math.round(current.wind_speed * 3.6), // m/s to km/h
        sunrise: formatTimeFromTimestamp(current.sunrise, timezone),
        sunset: formatTimeFromTimestamp(current.sunset, timezone),
        currentTime: formatTimeFromTimestamp(current.dt, timezone),
        forecast: daily.slice(0, 7).map(transformDailyData),
        history: [], // OpenWeather free tier doesn't provide easy history access.
        hourly: hourly.slice(0, 24).map((hour: any) => ({
            time: formatTimeFromTimestamp(hour.dt, timezone),
            condition: mapWeatherCondition(hour.weather[0].icon),
            temperature: Math.round(hour.temp),
            windSpeed: Math.round(hour.wind_speed * 3.6),
            humidity: Math.round(hour.humidity),
        })),
    };
    
    return transformedData;
  }
);

export async function getWeatherData(input: GetWeatherDataInput): Promise<GetWeatherDataOutput> {
  return getWeatherDataFlow(input);
}

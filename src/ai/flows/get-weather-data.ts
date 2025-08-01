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

async function getCoordinatesForLocation(location: string): Promise<{ lat: number; lon: number; name: string }> {
    const geoData = await fetchFromOpenWeather('geo/1.0/direct', { q: location, limit: '1' });
    if (!geoData || geoData.length === 0) {
        throw new Error(`Could not find coordinates for location: ${location}`);
    }
    return { lat: geoData[0].lat, lon: geoData[0].lon, name: geoData[0].name };
}


const getWeatherDataFlow = ai.defineFlow(
  {
    name: 'getWeatherDataFlow',
    inputSchema: GetWeatherDataInputSchema,
    outputSchema: GetWeatherDataOutputSchema,
  },
  async ({ location, lat, lon }) => {
    
    let locationName = location;
    let effectiveLat = lat;
    let effectiveLon = lon;

    if (location) {
        const coords = await getCoordinatesForLocation(location);
        effectiveLat = coords.lat;
        effectiveLon = coords.lon;
        locationName = coords.name;
    }

    if (effectiveLat === undefined || effectiveLon === undefined) {
        throw new Error("Could not determine coordinates for weather lookup.");
    }
    
    const weatherData = await fetchFromOpenWeather('data/2.5/onecall', {
        lat: effectiveLat.toString(),
        lon: effectiveLon.toString(),
        exclude: 'minutely,alerts',
    });

    if (!locationName) {
        const reverseGeo = await fetchFromOpenWebather('geo/1.0/reverse', { lat: effectiveLat.toString(), lon: effectiveLon.toString(), limit: '1' });
        locationName = reverseGeo[0]?.name || 'Current Location';
    }
    
    const timezoneOffset = weatherData.timezone_offset;

    const forecast = weatherData.daily.slice(0, 7).map((d: any) => ({
        day: format(new Date(d.dt * 1000), 'EEE'),
        condition: mapWeatherCondition(d.weather[0].icon),
        tempHigh: Math.round(d.temp.max),
        tempLow: Math.round(d.temp.min),
        humidity: Math.round(d.humidity),
    }));

    const hourly = weatherData.hourly.slice(0, 24).map((h: any) => ({
        time: formatTimeFromTimestamp(h.dt, timezoneOffset, { hour: 'numeric', hour12: true }),
        condition: mapWeatherCondition(h.weather[0].icon),
        temperature: Math.round(h.temp),
        windSpeed: Math.round(h.wind_speed * 3.6),
        humidity: Math.round(h.humidity),
    }));

    const transformedData: GetWeatherDataOutput = {
        location: locationName!,
        condition: mapWeatherCondition(weatherData.current.weather[0].icon),
        temperature: Math.round(weatherData.current.temp),
        feelsLike: Math.round(weatherData.current.feels_like),
        humidity: Math.round(weatherData.current.humidity),
        windSpeed: Math.round(weatherData.current.wind_speed * 3.6),
        sunrise: formatTimeFromTimestamp(weatherData.current.sunrise, timezoneOffset),
        sunset: formatTimeFromTimestamp(weatherData.current.sunset, timezoneOffset),
        currentTime: formatTimeFromTimestamp(weatherData.current.dt, timezoneOffset),
        forecast: forecast,
        hourly: hourly,
    };

    return transformedData;
  }
);


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
    let latitude = lat;
    let longitude = lon;
    let locationName = location;

    if (location) {
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=${apiKey}`;
      const geoResponse = await fetch(geoUrl);
      if (!geoResponse.ok) {
          const errorBody = await geoResponse.text();
          throw new Error(`OpenWeather Geocoding API request failed with status ${geoResponse.status}: ${errorBody}`);
      }
      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) {
        throw new Error(`Could not find location: ${location}`);
      }
      latitude = geoData[0].lat;
      longitude = geoData[0].lon;
      locationName = geoData[0].name;
    }

    if (latitude === undefined || longitude === undefined) {
      throw new Error("Could not determine coordinates for the location.");
    }
    
    const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,alerts&appid=${apiKey}&units=metric`;
    const oneCallResponse = await fetch(oneCallUrl);
    if (!oneCallResponse.ok) {
        const errorBody = await oneCallResponse.text();
        throw new Error(`OpenWeather One Call API request failed with status ${oneCallResponse.status}: ${errorBody}`);
    }
    const data = await oneCallResponse.json();
    
    const timezoneOffset = data.timezone_offset;

    const hourly = data.hourly.slice(0, 24).map((h: any) => ({
      time: formatTimeFromTimestamp(h.dt, timezoneOffset, { hour: 'numeric', minute: '2-digit', hour12: true }),
      condition: mapWeatherCondition(h.weather[0].main),
      temperature: Math.round(h.temp),
      windSpeed: Math.round(h.wind_speed * 3.6),
      humidity: Math.round(h.humidity),
    }));

    const forecast = data.daily.slice(0, 7).map((d: any) => ({
      day: format(new Date(d.dt * 1000), 'EEE'),
      condition: mapWeatherCondition(d.weather[0].main),
      tempHigh: Math.round(d.temp.max),
      tempLow: Math.round(d.temp.min),
      humidity: Math.round(d.humidity),
    }));

    if (!locationName) {
        const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`;
        const reverseGeoResponse = await fetch(reverseGeoUrl);
        if (reverseGeoResponse.ok) {
            const reverseGeoData = await reverseGeoResponse.json();
            if (reverseGeoData && reverseGeoData.length > 0) {
                locationName = reverseGeoData[0].name;
            }
        }
    }
     
    const transformedData: GetWeatherDataOutput = {
        location: locationName || 'Current Location',
        condition: mapWeatherCondition(data.current.weather[0].main),
        temperature: Math.round(data.current.temp),
        feelsLike: Math.round(data.current.feels_like),
        humidity: Math.round(data.current.humidity),
        windSpeed: Math.round(data.current.wind_speed * 3.6),
        sunrise: formatTimeFromTimestamp(data.current.sunrise, timezoneOffset),
        sunset: formatTimeFromTimestamp(data.current.sunset, timezoneOffset),
        currentTime: formatTimeFromTimestamp(data.current.dt, timezoneOffset),
        forecast: forecast,
        hourly: hourly,
    };

    return transformedData;
  }
);

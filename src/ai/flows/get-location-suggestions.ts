'use server';

/**
 * @fileOverview Provides location suggestions and auto-correction for weather searches.
 *
 * - getLocationSuggestions - A function that returns a list of suggested locations based on user input.
 * - GetLocationSuggestionsInput - The input type for the getLocationSuggestions function.
 * - GetLocationSuggestionsOutput - The return type for the getLocationSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {locations} from '@/lib/weather-data';

const GetLocationSuggestionsInputSchema = z.object({
  input: z.string().describe('The partial or misspelled city name entered by the user.'),
});
export type GetLocationSuggestionsInput = z.infer<typeof GetLocationSuggestionsInputSchema>;

const GetLocationSuggestionsOutputSchema = z.object({
    suggestions: z.array(z.string()).describe('A list of suggested city names.'),
});
export type GetLocationSuggestionsOutput = z.infer<typeof GetLocationSuggestionsOutputSchema>;

export async function getLocationSuggestions(input: GetLocationSuggestionsInput): Promise<GetLocationSuggestionsOutput> {
  return getLocationSuggestionsFlow(input);
}

const knownCities = locations.map(l => l.location);

const getLocationSuggestionsFlow = ai.defineFlow(
  {
    name: 'getLocationSuggestionsFlow',
    inputSchema: GetLocationSuggestionsInputSchema,
    outputSchema: GetLocationSuggestionsOutputSchema,
  },
  async input => {
    if (input.input.length < 2) {
        return { suggestions: [] };
    }
    
    const lowercasedInput = input.input.toLowerCase();
    const suggestions = knownCities
        .filter(city => city.toLowerCase().includes(lowercasedInput))
        .slice(0, 5);

    return { suggestions };
  }
);

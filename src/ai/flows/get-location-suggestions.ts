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

const prompt = ai.definePrompt({
    name: 'getLocationSuggestionsPrompt',
    input: { schema: GetLocationSuggestionsInputSchema },
    output: { schema: GetLocationSuggestionsOutputSchema },
    prompt: `You are a helpful assistant that provides city name suggestions for a weather app.
The user is typing a city name and you need to provide a list of likely suggestions.
If the input seems misspelled, provide corrected suggestions.
Provide a list of up to 5 suggestions.

User input: {{{input}}}

Here is a list of known cities to help you: ${knownCities.join(', ')}

Return a JSON object with a "suggestions" array.`,
});

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
    const {output} = await prompt(input);
    return output!;
  }
);

'use server';

/**
 * @fileOverview Uses generative AI to enhance the visual fidelity of weather representation in the 3D weather visualization.
 *
 * - generateWeatherAsset - A function that generates enhanced weather visualization assets.
 * - GenerateWeatherAssetInput - The input type for the generateWeatherAsset function.
 * - GenerateWeatherAssetOutput - The return type for the generateWeatherAsset function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWeatherAssetInputSchema = z.object({
  weatherCondition: z.string().describe('The current weather condition (e.g., sunny, rainy, snowy, cloudy).'),
  assetDescription: z.string().describe('A description of the existing 3D weather visualization asset.'),
});
export type GenerateWeatherAssetInput = z.infer<typeof GenerateWeatherAssetInputSchema>;

const GenerateWeatherAssetOutputSchema = z.object({
  enhancedAssetDataUri: z.string().describe('A data URI containing the enhanced 3D weather visualization asset.'),
  description: z.string().describe('Description of the enhanced asset, including changes made.'),
});
export type GenerateWeatherAssetOutput = z.infer<typeof GenerateWeatherAssetOutputSchema>;

export async function generateWeatherAsset(input: GenerateWeatherAssetInput): Promise<GenerateWeatherAssetOutput> {
  return generateWeatherAssetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWeatherAssetPrompt',
  input: {schema: GenerateWeatherAssetInputSchema},
  output: {schema: GenerateWeatherAssetOutputSchema},
  prompt: `You are an AI assistant specializing in enhancing 3D weather visualizations. Given the current weather condition and a description of the existing 3D asset, generate an enhanced version of the asset using generative AI techniques to improve visual fidelity and realism.

Weather Condition: {{{weatherCondition}}}
Asset Description: {{{assetDescription}}}

Instructions:
1.  Analyze the weather condition and identify potential enhancements to the existing 3D asset.
2.  Use generative AI techniques to create a more realistic and immersive visualization of the weather condition. For example, add more detailed textures, realistic lighting effects, or dynamic particle effects (e.g., raindrops, snowflakes).
3.  Output the enhanced 3D asset as a data URI.
4.  Provide a description of the changes made to the asset and how they enhance the visual fidelity.

Output:
{
  enhancedAssetDataUri: "data:<mimetype>;base64,<encoded_data>",
  description: "Description of enhanced asset and changes made."
}
`,
});

const generateWeatherAssetFlow = ai.defineFlow(
  {
    name: 'generateWeatherAssetFlow',
    inputSchema: GenerateWeatherAssetInputSchema,
    outputSchema: GenerateWeatherAssetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

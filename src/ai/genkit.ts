import {genkit} from 'genkit';
import { googleAI } from './genkit-client';

export const ai = genkit({
  plugins: [googleAI()].filter(p => p !== null) as any,
  model: 'googleai/gemini-2.0-flash',
});

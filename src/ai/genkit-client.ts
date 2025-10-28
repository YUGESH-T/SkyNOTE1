import { googleAI as googleAIPlugin } from '@genkit-ai/googleai';

// This is a wrapper around the Google AI plugin initialization.
// It checks for the API key and only returns the plugin if it's available.
// Otherwise, it returns null. This prevents the server from crashing if the
// API key is not configured in the environment.

export function googleAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    return googleAIPlugin();
  }
  console.warn(
    "GEMINI_API_KEY or GOOGLE_API_KEY is not set. The Google AI plugin will not be available."
  );
  return null;
}

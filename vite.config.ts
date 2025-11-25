import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Aggressively find the API Key from various possible sources
  // Vercel system envs are often in process.env, while local .env files are in `env`
  const apiKey = env.API_KEY || env.VITE_API_KEY || process.env.API_KEY || process.env.VITE_API_KEY;

  console.log(`[Vite Build] API Key status: ${apiKey ? 'Found' : 'Missing'}`);

  return {
    plugins: [react()],
    define: {
      // Explicitly replace process.env.API_KEY with the value from the environment
      // This string replacement happens at build time.
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});
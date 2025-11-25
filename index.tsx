import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("InfoPulse AI: Starting up...");

// Fix for Vercel/Vite deployment:
// Map the Vite-specific environment variable to the global process.env we defined in index.html
try {
  // @ts-ignore
  if (window.process && window.process.env) {
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_API_KEY;
    if (viteKey) {
      console.log("InfoPulse AI: API Key injected successfully");
      // @ts-ignore
      window.process.env.API_KEY = viteKey;
    } else {
      console.warn("InfoPulse AI: VITE_API_KEY not found in import.meta.env");
    }
  }
} catch (e) {
  console.warn("Environment variable polyfill failed:", e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("InfoPulse AI: React mounted");
} catch (err) {
  console.error("React Mount Error:", err);
  throw err; 
}
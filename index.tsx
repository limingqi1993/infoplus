import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fix for Vercel/Vite deployment:
// Polyfill `process.env` so that the Google GenAI SDK (which expects Node.js environment)
// can access the API key safely without crashing the browser.
if (typeof process === 'undefined') {
  (window as any).process = {
    env: {
      // Map the Vite-specific environment variable to the process.env key expected by the SDK
      // @ts-ignore
      API_KEY: import.meta.env?.VITE_API_KEY || ''
    }
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
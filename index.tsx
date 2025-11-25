import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fix for Vercel/Vite deployment:
// Map the Vite-specific environment variable to the global process.env we defined in index.html
try {
  // @ts-ignore
  if (window.process && window.process.env) {
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_API_KEY;
    if (viteKey) {
      // @ts-ignore
      window.process.env.API_KEY = viteKey;
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
} catch (err) {
  console.error("React Mount Error:", err);
  // Allow the global window.onerror in index.html to catch and display this
  throw err; 
}
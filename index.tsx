import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fix for Vercel/Vite deployment:
// Map the Vite-specific environment variable to the global process.env we defined in index.html
// @ts-ignore
if (window.process && window.process.env) {
  // @ts-ignore
  window.process.env.API_KEY = import.meta.env?.VITE_API_KEY || '';
  
  // Debug log to check if key is loaded (safe to remove in strict production)
  // console.log("API Key loaded:", !!process.env.API_KEY); 
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
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fix for Vercel/Vite deployment:
// We have already defined `window.process` in index.html to prevent crash during imports.
// Now we populate it with the actual values from Vite's import.meta.env.
// @ts-ignore
if (window.process && window.process.env) {
  // @ts-ignore
  window.process.env.API_KEY = import.meta.env.VITE_API_KEY || '';
}

// @ts-ignore
console.log("Environment initialized. Key present:", !!import.meta.env.VITE_API_KEY);

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
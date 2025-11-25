import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("InfoPulse AI: Starting up...");

// Safe check for API Key presence
// Uses a robust check that won't throw ReferenceError if 'process' is missing
const getApiKey = () => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process?.env?.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore errors accessing process
  }
  return null;
};

const apiKey = getApiKey();

if (apiKey) {
  console.log("InfoPulse AI: API Key is configured.");
} else {
  console.warn("InfoPulse AI: API Key is missing. Please set API_KEY in variables.");
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
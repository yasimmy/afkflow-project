import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/globals.css';
import { preloadBotIcons } from '@/assets/botIcons';

// Kick off image preloading immediately — before React mounts.
// This warms the browser/Tauri cache so icons are ready when the home page renders.
preloadBotIcons();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('[AFKFlow] #root element not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

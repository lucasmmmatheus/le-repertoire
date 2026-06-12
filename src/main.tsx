import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './ui.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA: registra o service worker só em produção (evita interferir no HMR do dev).
// BASE_URL cobre o deploy fora da raiz (ex.: GitHub Pages em /le-repertoire/).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

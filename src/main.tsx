import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Immediate Service Worker registration for PWA compliance & PWABuilder APK packaging
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('Daily Pilot Service Worker active:', reg.scope);
      })
      .catch((err) => {
        console.warn('SW registration status:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);


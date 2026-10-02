import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './styles/fonts.css';
import './styles/theme.css';
import './styles/layout.css';
import './styles/panels.css';
import './styles/stage.css';
import './styles/transport.css';
import './styles/settings.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Offline cache for the production build. Reading navigator.serviceWorker
// throws in a sandboxed iframe without allow-same-origin, so it's guarded;
// without a service worker the site works the same, just uncached.
function registerServiceWorker() {
  try {
    if (window.isSecureContext && navigator.serviceWorker) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  } catch {
    // sandboxed / unsupported
  }
}
if (import.meta.env.PROD) window.addEventListener('load', registerServiceWorker);

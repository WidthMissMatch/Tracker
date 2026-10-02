import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/fonts.css';
import './styles/theme.css';
import './styles/layout.css';
import './styles/panels.css';
import './styles/stage.css';
import './styles/transport.css';
import './styles/settings.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

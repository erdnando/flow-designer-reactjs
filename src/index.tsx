import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeGlobals } from './shared/utils/globalInit';

// Inicializar variables globales antes de renderizar la aplicación
initializeGlobals();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/inter';
import '@fontsource-variable/nunito';
import '@fontsource-variable/jetbrains-mono';
import './styles/theme.css';

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró #root');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

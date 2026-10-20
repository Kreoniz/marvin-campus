import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './app.css';
import { initPwa } from './lib/pwa.ts';

initPwa();
createRoot(document.getElementById('app')!).render(<App />);

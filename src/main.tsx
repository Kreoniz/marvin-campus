import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './app/styles.css';
import { initPwa } from './lib/pwa.ts';

initPwa();
createRoot(document.getElementById('app')!).render(<App />);

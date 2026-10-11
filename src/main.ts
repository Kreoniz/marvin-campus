import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { initPwa } from './lib/pwa.svelte.ts';

initPwa();
mount(App, { target: document.getElementById('app')! });

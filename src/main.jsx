import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './animations.css';
import App from './App.jsx';
import { registerSW } from './lib/pwa.js';

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);

registerSW();

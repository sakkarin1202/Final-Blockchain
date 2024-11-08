import React from 'react';
import ReactDOM from 'react-dom/client'; // ใช้ react-dom/client แทน react-dom
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')); // สร้าง root โดยใช้ createRoot
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

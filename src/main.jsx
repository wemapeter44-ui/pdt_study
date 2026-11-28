import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ConfirmProvider from './context/ConfirmContext.jsx';
import ToastProvider from './context/ToastContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ConfirmProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ConfirmProvider>
    </AuthProvider>
  </React.StrictMode>
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import './styles/theme.css';

const renderTree = () =>
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(App),
      ),
    ),
  );

ReactDOM.createRoot(document.getElementById('root')).render(renderTree());

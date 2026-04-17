import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx';
import { ErrorProvider } from "./context/ErrorContext";
import axios from "axios";

axios.defaults.withCredentials = true;
createRoot(document.getElementById('root')).render(
  <ErrorProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorProvider>
)

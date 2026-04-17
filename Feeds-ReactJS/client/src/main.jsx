import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { Provider } from 'react-redux';
import { store } from './redux/store.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ThemeManager from './components/themeManager.jsx';
import { ErrorProvider } from './providers/ErrorContext.jsx';
import NotFound from './components/error.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorProvider>
      <NotFound />
      <Provider store={store}>
        <ErrorBoundary>
          <ThemeManager />
          <App />
        </ErrorBoundary>
      </Provider>
    </ErrorProvider>
  </StrictMode>,
);

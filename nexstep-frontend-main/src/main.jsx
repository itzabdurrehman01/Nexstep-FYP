import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { I18nLanguageProvider }       from './context/I18nContext.jsx';
import { ThemeProvider }               from './context/ThemeContext.jsx';
import { AuthProvider }                from './context/AuthContext.jsx';
import { ClerkSetup }                  from './auth/ClerkSetup.jsx';
import { ToastProvider }               from './context/ToastContext.jsx';
import { NotificationProvider }        from './context/NotificationContext.jsx';
import { DynamicTranslationProvider }  from './context/DynamicTranslationContext.jsx';
import './index.css';
import './styles/marketing.css';
import './styles/pro-theme.css';
import './styles/sidebar.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <ThemeProvider>
          <ClerkSetup>
          <I18nLanguageProvider>
            <DynamicTranslationProvider>
              <AuthProvider>
                <ToastProvider>
                  <NotificationProvider>
                    <App />
                  </NotificationProvider>
                </ToastProvider>
              </AuthProvider>
            </DynamicTranslationProvider>
          </I18nLanguageProvider>
          </ClerkSetup>
        </ThemeProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>
);

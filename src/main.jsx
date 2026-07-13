import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SupportChatProvider } from './context/SupportChatContext.jsx'
import { AnalyticsProvider } from './context/AnalyticsContext.jsx'
import { I18nProvider } from './context/I18nContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <SupportChatProvider>
            <AnalyticsProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </AnalyticsProvider>
          </SupportChatProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)

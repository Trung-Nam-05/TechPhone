import { createContext, useContext, useMemo } from 'react';
import { apiFetch } from '../config/api';

const AnalyticsContext = createContext();

export function AnalyticsProvider({ children }) {
  const track = async (eventName, payload = {}) => {
    try {
      await apiFetch('/api/analytics/events', {
        method: 'POST',
        body: JSON.stringify({
          eventName,
          path: window.location.pathname,
          ...payload,
        }),
      });
    } catch {
      // Do not block user flow if analytics fails.
    }
  };

  const value = useMemo(() => ({ track }), []);
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider.');
  }
  return context;
}

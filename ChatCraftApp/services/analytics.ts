// Google Analytics 4 for React Native (Expo)
// Using gtag.js approach for web and custom events for native
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const GA_MEASUREMENT_ID = Constants.expoConfig?.extra?.gaMeasurementId || 
                          process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID || '';

const isEnabled = !!GA_MEASUREMENT_ID && Constants.expoConfig?.extra?.environment !== 'development';

// Initialize GA4 for web (only on client-side)
if (Platform.OS === 'web' && isEnabled && typeof window !== 'undefined') {
  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
  (window as any).gtag = gtag;
}

export const analytics = {
  /**
   * Log screen view
   */
  logScreenView(screenName: string, screenClass?: string) {
    if (!isEnabled) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if ((window as any).gtag) {
        (window as any).gtag('event', 'page_view', {
          page_title: screenName,
          page_location: window.location.href,
          page_path: window.location.pathname,
        });
      }
    } else {
      // For native, you would implement Firebase Analytics here
      console.log('[Analytics] Screen View:', screenName, screenClass);
    }
  },

  /**
   * Log custom event
   */
  logEvent(eventName: string, params?: Record<string, any>) {
    if (!isEnabled) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if ((window as any).gtag) {
        (window as any).gtag('event', eventName, params);
      }
    } else {
      // For native, you would implement Firebase Analytics here
      console.log('[Analytics] Event:', eventName, params);
    }
  },

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>) {
    if (!isEnabled) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if ((window as any).gtag) {
        (window as any).gtag('set', 'user_properties', properties);
      }
    } else {
      console.log('[Analytics] User Properties:', properties);
    }
  },

  /**
   * Set user ID
   */
  setUserId(userId: string) {
    if (!isEnabled) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if ((window as any).gtag) {
        (window as any).gtag('set', { user_id: userId });
      }
    } else {
      console.log('[Analytics] User ID:', userId);
    }
  },
};

// Common analytics events
export const AnalyticsEvents = {
  // Auth
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // Mate
  MATE_CREATE: 'mate_create',
  MATE_EDIT: 'mate_edit',
  MATE_DELETE: 'mate_delete',
  MATE_VIEW: 'mate_view',
  
  // Chat
  CHAT_SEND: 'chat_send',
  CHAT_VIEW: 'chat_view',
  
  // Explore
  EXPLORE_VIEW: 'explore_view',
  PUBLIC_MATE_VIEW: 'public_mate_view',
  
  // Feedback
  FEEDBACK_OPEN: 'feedback_open',
  
  // Profile
  PROFILE_VIEW: 'profile_view',
};

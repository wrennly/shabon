// src/analytics.ts

import ReactGA from 'react-ga4';
import { GA_MEASUREMENT_ID } from './constants';

export const initializeGA = () => {
  if (GA_MEASUREMENT_ID) {
    ReactGA.initialize(GA_MEASUREMENT_ID, {
      gaOptions: {
        cookieFlags: 'SameSite=None;Secure',
      },
    });
  }
};

export const trackPageView = (path: string) => {
  if (GA_MEASUREMENT_ID) {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: document.title,
    });
  }
};

export const trackEvent = (category: string, action: string, label?: string) => {
  if (GA_MEASUREMENT_ID) {
    ReactGA.event({
      category,
      action,
      label,
    });
  }
};

export const trackMateView = (mateId: string, mateName: string) => {
  trackEvent('mate', 'view', mateName);
};

export const trackChatMessage = (mateId: string) => {
  trackEvent('chat', 'send_message', mateId);
};

export const trackMateCreate = () => {
  trackEvent('mate', 'create');
};

export const trackMatePublish = (mateId: string) => {
  trackEvent('mate', 'publish', mateId);
};

export const trackSearch = (searchTerm: string) => {
  trackEvent('search', 'query', searchTerm);
};

export const trackLogin = () => {
  trackEvent('auth', 'login');
};

export const trackLogout = () => {
  trackEvent('auth', 'logout');
};

/**
 * App configuration and failure handling
 */

export const APP_CONFIG = {
  // Network settings
  NETWORK: {
    TIMEOUTS: {
      FIREBASE_INIT: 15000,
      MONETAG_LOAD: 10000,
      NETWORK_CHECK: 5000,
      AUTH_OPERATION: 10000
    },
    RETRY: {
      MAX_RETRIES: 3,
      BASE_DELAY: 1000,
      MAX_DELAY: 10000,
      BACKOFF_FACTOR: 2
    }
  },

  // Firebase settings
  FIREBASE: {
    PROJECT_ID: 'n8n360-8ba3b',
    AUTH_DOMAIN: 'n8n360-8ba3b.firebaseapp.com',
    DATABASE_URL: 'https://n8n360-8ba3b-default-rtdb.firebaseio.com',
    STORAGE_BUCKET: 'n8n360-8ba3b.firebasestorage.app',
    MESSAGING_SENDER_ID: '407502960706',
    APP_ID: '1:407502960706:web:c0e8094d7ebec73c6cd5db'
  },

  // Monetag settings
  MONETAG: {
    DEFAULT_ZONE_ID: '10748729',
    SCRIPT_URL: 'https://5gvci.com/act/files/tag.min.js',
    FALLBACK_ENABLED: true,
    LOAD_TIMEOUT: 8000
  },

  // Error messages
  ERROR_MESSAGES: {
    NETWORK_OFFLINE: 'No internet connection. Please check your connection and try again.',
    FIREBASE_UNREACHABLE: 'Cannot reach Firebase services. You may need to use a VPN.',
    MONETAG_UNREACHABLE: 'Could not load ad service. The app will continue to work normally.',
    AUTH_FAILED: 'Authentication failed. Please check your credentials and try again.',
    TIMEOUT: 'Connection timed out. Please try again.',
    UNKNOWN: 'An unexpected error occurred. Please reload the page.'
  },

  // Loading settings
  LOADING: {
    STEPS: [
      'Checking internet connection...',
      'Connecting to Firebase services...',
      'Loading app settings...',
      'Initializing authentication...',
      'Loading complete'
    ],
    SLOW_MESSAGE: 'This is taking longer than usual. Please wait...',
    SLOW_THRESHOLD: 5000,
    MIN_DISPLAY_TIME: 2000,
    MAX_WAIT_TIME: 30000
  }
};

// Get appropriate error message
export function getErrorMessage(error: any): string {
  if (!navigator.onLine) {
    return APP_CONFIG.ERROR_MESSAGES.NETWORK_OFFLINE;
  }

  const errorCode = error?.code;
  const errorMessage = error?.message?.toLowerCase();

  if (errorMessage?.includes('network') || errorMessage?.includes('fetch')) {
    return APP_CONFIG.ERROR_MESSAGES.NETWORK_OFFLINE;
  }

  if (errorMessage?.includes('firebase') || errorMessage?.includes('auth')) {
    if (errorCode === 'auth/network-request-failed') {
      return APP_CONFIG.ERROR_MESSAGES.NETWORK_OFFLINE;
    }
    return APP_CONFIG.ERROR_MESSAGES.FIREBASE_UNREACHABLE;
  }

  if (errorMessage?.includes('timeout')) {
    return APP_CONFIG.ERROR_MESSAGES.TIMEOUT;
  }

  return APP_CONFIG.ERROR_MESSAGES.UNKNOWN;
}

// Check if error requires VPN
export function requiresVPN(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase();
  const errorCode = error?.code;

  return (
    errorMessage?.includes('network') ||
    errorMessage?.includes('fetch') ||
    errorMessage?.includes('cors') ||
    errorCode === 'auth/network-request-failed' ||
    errorMessage?.includes('firebase') && errorMessage?.includes('unreachable')
  );
}

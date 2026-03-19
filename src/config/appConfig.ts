/**
 * إعدادات التطبيق والتعامل مع حالات الفشل
 */

export const APP_CONFIG = {
  // إعدادات الشبكة
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

  // إعدادات Firebase
  FIREBASE: {
    PROJECT_ID: 'n8n360-8ba3b',
    AUTH_DOMAIN: 'n8n360-8ba3b.firebaseapp.com',
    DATABASE_URL: 'https://n8n360-8ba3b-default-rtdb.firebaseio.com',
    STORAGE_BUCKET: 'n8n360-8ba3b.firebasestorage.app',
    MESSAGING_SENDER_ID: '407502960706',
    APP_ID: '1:407502960706:web:c0e8094d7ebec73c6cd5db'
  },

  // إعدادات Monetag
  MONETAG: {
    DEFAULT_ZONE_ID: '10748605',
    SCRIPT_URL: 'https://5gvci.com/act/files/tag.min.js',
    FALLBACK_ENABLED: true,
    LOAD_TIMEOUT: 8000
  },

  // رسائل الخطأ
  ERROR_MESSAGES: {
    NETWORK_OFFLINE: 'لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
    FIREBASE_UNREACHABLE: 'لا يمكن الوصول إلى خدمات Firebase. قد تحتاج إلى استخدام VPN.',
    MONETAG_UNREACHABLE: 'لا يمكن تحميل خدمة الإعلانات. سيستمر التطبيق في العمل بشكل طبيعي.',
    AUTH_FAILED: 'فشلت المصادقة. يرجى التحقق من بياناتك والمحاولة مرة أخرى.',
    TIMEOUT: 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.',
    UNKNOWN: 'حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة.'
  },

  // إعدادات التحميل
  LOADING: {
    STEPS: [
      'التحقق من الاتصال بالإنترنت...',
      'الاتصال بخدمات Firebase...',
      'تحميل إعدادات التطبيق...',
      'تهيئة المصادقة...',
      'اكتمل التحميل'
    ],
    MIN_DISPLAY_TIME: 2000,
    MAX_WAIT_TIME: 30000
  }
};

// دالة للحصول على رسالة الخطأ المناسبة
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

// دالة للتحقق مما إذا كان الخطأ يتطلب VPN
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

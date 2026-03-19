/**
 * خدمات Firebase محسنة مع معالجة الأخطاء وإعادة المحاولة
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { RetryManager } from '../utils/retryManager';
import { APP_CONFIG } from '../config/appConfig';

const firebaseConfig = {
  apiKey: "AIzaSyD6LyoG8UhLN9ovjc0WGVWIPNHZkYEkFcg",
  authDomain: "n8n360-8ba3b.firebaseapp.com",
  projectId: "n8n360-8ba3b",
  storageBucket: "n8n360-8ba3b.firebasestorage.app",
  messagingSenderId: "407502960706",
  appId: "1:407502960706:web:c0e8094d7ebec73c6cd5db",
  measurementId: "G-7ZXGRBSL1C"
};

class EnhancedFirebaseService {
  private static instance: EnhancedFirebaseService;
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private auth: Auth | null = null;
  private googleProvider: GoogleAuthProvider | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): EnhancedFirebaseService {
    if (!EnhancedFirebaseService.instance) {
      EnhancedFirebaseService.instance = new EnhancedFirebaseService();
    }
    return EnhancedFirebaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await RetryManager.executeWithRetryAndTimeout(
        async () => {
          // تهيئة تطبيق Firebase
          this.app = initializeApp(firebaseConfig);
          
          // تهيئة الخدمات
          this.db = getFirestore(this.app);
          this.auth = getAuth(this.app);
          this.googleProvider = new GoogleAuthProvider();

          // إعدادات إضافية للمصادقة
          this.auth.languageCode = 'ar';
          
          console.log('تم تهيئة Firebase بنجاح');
        },
        {
          maxRetries: APP_CONFIG.NETWORK.RETRY.MAX_RETRIES,
          baseDelay: APP_CONFIG.NETWORK.RETRY.BASE_DELAY,
          maxDelay: APP_CONFIG.NETWORK.RETRY.MAX_DELAY,
          backoffFactor: APP_CONFIG.NETWORK.RETRY.BACKOFF_FACTOR
        },
        APP_CONFIG.NETWORK.TIMEOUTS.FIREBASE_INIT
      );

      this.isInitialized = true;
    } catch (error) {
      console.error('فشل تهيئة Firebase:', error);
      throw new Error(APP_CONFIG.ERROR_MESSAGES.FIREBASE_UNREACHABLE);
    }
  }

  getApp(): FirebaseApp {
    if (!this.app) {
      throw new Error('لم يتم تهيئة Firebase بعد');
    }
    return this.app;
  }

  getFirestore(): Firestore {
    if (!this.db) {
      throw new Error('لم يتم تهيئة Firestore بعد');
    }
    return this.db;
  }

  getAuth(): Auth {
    if (!this.auth) {
      throw new Error('لم يتم تهيئة المصادقة بعد');
    }
    return this.auth;
  }

  getGoogleProvider(): GoogleAuthProvider {
    if (!this.googleProvider) {
      throw new Error('لم يتم تهيئة مزود Google بعد');
    }
    return this.googleProvider;
  }

  isReady(): boolean {
    return this.isInitialized && this.app !== null && this.db !== null && this.auth !== null;
  }

  async checkConnection(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      // محاولة قراءة مجموعة بسيطة للتحقق من الاتصال
      const { collection, getDocs, limit, query } = await import('firebase/firestore');
      const testQuery = query(collection(this.db!, '_connection_test'), limit(1));
      await RetryManager.executeWithTimeout(
        () => getDocs(testQuery),
        5000
      );
      return true;
    } catch (error) {
      console.warn('فشل التحقق من اتصال Firebase:', error);
      return false;
    }
  }

  async waitForConnection(timeout: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.checkConnection()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }
}

// تصدير الخدمة المحسنة
export const enhancedFirebase = EnhancedFirebaseService.getInstance();

// تصدير التوافق القديم - تم إزالته لتجنب أخطاء التحميل المتزامن

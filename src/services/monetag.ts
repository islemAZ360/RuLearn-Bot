/**
 * Monetag Ads Helper - نسخة محسنة مع معالجة الأخطاء
 */

import { RetryManager } from '../utils/retryManager';

export const MonetagService = {
  isLoaded: false,
  loadPromise: null as Promise<boolean> | null,

  // تحميل آمن لخدمة Monetag مع إعادة المحاولة
  async loadScript(zoneId?: string): Promise<boolean> {
    if (this.isLoaded) {
      return true;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.attemptScriptLoad(zoneId);
    return this.loadPromise;
  },

  // محاولة تحميل النص البرمجي مع إعادة المحاولة
  async attemptScriptLoad(zoneId?: string): Promise<boolean> {
    const finalZoneId = zoneId || '10748605';
    
    if (!finalZoneId) return false;
    
    // منع التكرار
    if (document.getElementById('monetag-script')) {
      MonetagService.isLoaded = true;
      return true;
    }

    try {
      await RetryManager.executeWithRetryAndTimeout(
        async () => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = 'monetag-script';
            script.src = `https://5gvci.com/act/files/tag.min.js?z=${finalZoneId}`;
            script.async = true;
            script.dataset.cfasync = "false";
            script.dataset.zone = finalZoneId;
            
            script.onload = () => {
              console.log(`Monetag Zone ${finalZoneId} loaded successfully`);
              resolve(true);
            };
            
            script.onerror = (error) => {
              console.warn(`Failed to load Monetag script:`, error);
              reject(new Error('فشل تحميل Monetag'));
            };
            
            // إضافة مهلة للتحميل
            setTimeout(() => {
              reject(new Error('انتهت مهلة تحميل Monetag'));
            }, 8000);
            
            // Insert at the top of head for better performance
            if (document.head.firstChild) {
              document.head.insertBefore(script, document.head.firstChild);
            } else {
              document.head.appendChild(script);
            }
          });
        },
        { maxRetries: 2, baseDelay: 1000 },
        10000
      );

      MonetagService.isLoaded = true;
      return true;
    } catch (error) {
      console.warn('فشل تحميل Monetag بعد عدة محاولات:', error);
      MonetagService.isLoaded = false;
      return false;
    }
  },

  // حقن كود Monetag في الموقع (الطريقة القديمة للتوافق)
  injectScript: async (zoneId?: string) => {
    try {
      await MonetagService.loadScript(zoneId);
    } catch (error) {
      console.warn('فشل حقن Monetag:', error);
    }
  },

  // إزالة الكود إذا لزم الأمر
  removeScript: () => {
    const script = document.getElementById('monetag-script');
    if (script) {
      script.remove();
      MonetagService.isLoaded = false;
      MonetagService.loadPromise = null;
    }
  },

  // التحقق مما إذا كانت الخدمة متاحة
  isAvailable: (): boolean => {
    return MonetagService.isLoaded && document.getElementById('monetag-script') !== null;
  }
};

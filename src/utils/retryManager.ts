/**
 * مدير إعادة المحاولة الذكي للخدمات
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

export class RetryManager {
  private static defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error) => {
      // إعادة المحاولة فقط للأخطاء القابلة للاسترداد
      return !error.name?.includes('AbortError') && 
             !error.message?.includes('User cancelled') &&
             !error.message?.includes('timeout');
    }
  };

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...RetryManager.defaultConfig, ...config };
    let lastError: any;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // التحقق إذا كان يجب إعادة المحاولة
        if (attempt === finalConfig.maxRetries || 
            (finalConfig.retryCondition && !finalConfig.retryCondition(error))) {
          throw error;
        }

        // حساب التأخير مع التراجع الأسي
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt),
          finalConfig.maxDelay
        );

        console.warn(`المحاولة ${attempt + 1} فشلت، إعادة المحاولة بعد ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  static async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`انتهت مهلة العملية بعد ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  static async executeWithRetryAndTimeout<T>(
    operation: () => Promise<T>,
    retryConfig: Partial<RetryConfig> = {},
    timeoutMs: number = 15000
  ): Promise<T> {
    return RetryManager.executeWithRetry(
      () => RetryManager.executeWithTimeout(operation, timeoutMs),
      retryConfig
    );
  }
}

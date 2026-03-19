/**
 * معالج خاص لمشاكل appCreator24
 */

export class AppCreator24Handler {
  private static instance: AppCreator24Handler;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AppCreator24Handler {
    if (!AppCreator24Handler.instance) {
      AppCreator24Handler.instance = new AppCreator24Handler();
    }
    return AppCreator24Handler.instance;
  }

  initialize(): void {
    if (this.isInitialized) return;

    this.hideDisconnectedDialogs();
    this.setupNetworkMonitoring();
    this.isInitialized = true;
  }

  private hideDisconnectedDialogs(): void {
    // إخفاء رسائل Disconnected من appCreator24
    const checkAndHide = () => {
      // البحث عن النوافذ المنبثقة التي تحتوي على رسالة Disconnected
      const dialogs = document.querySelectorAll('*');
      
      dialogs.forEach(element => {
        const text = element.textContent?.toLowerCase() || '';
        
        // التحقق إذا كان العنصر يظهر كنافذة منبثقة ويحتوي على رسالة الخطأ
        if (
          (text.includes('disconnected') || text.includes('internet connection')) &&
          (element as HTMLElement).style
        ) {
          const htmlElement = element as HTMLElement;
          const computedStyle = window.getComputedStyle(htmlElement);
          
          if (
            (computedStyle.position === 'fixed' || computedStyle.position === 'absolute') &&
            (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden')
          ) {
            // إخفاء النافذة
            htmlElement.style.display = 'none';
            htmlElement.remove();
            
            console.log('تم إخفاء نافذة Disconnected من appCreator24');
          }
        }
      });

      // البحث عن أزرار CLOSE والنقر عليها
      const closeButtons = document.querySelectorAll('button, [role="button"], div[onclick]');
      closeButtons.forEach(button => {
        const buttonText = button.textContent?.trim().toUpperCase() || '';
        if (buttonText === 'CLOSE') {
          const htmlButton = button as HTMLElement;
          
          // محاكاة النقر
          htmlButton.click();
          
          // إخفاء العنصر الأب
          const parent = htmlButton.closest('[style*="position: fixed"], [style*="position: absolute"]');
          if (parent && (parent as HTMLElement).style) {
            (parent as HTMLElement).style.display = 'none';
            parent.remove();
          }
        }
      });
    };

    // التحقق فورًا
    checkAndHide();

    // مراقبة التغييرات في DOM
    const observer = new MutationObserver(() => {
      checkAndHide();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // التحقق الدوري
    const interval = setInterval(checkAndHide, 50);

    // التوقف بعد 15 ثانية
    setTimeout(() => {
      clearInterval(interval);
      observer.disconnect();
    }, 15000);
  }

  private setupNetworkMonitoring(): void {
    // إضافة مستمعي أحداث للشبكة
    window.addEventListener('online', () => {
      console.log('الشبكة متاحة الآن');
      this.hideDisconnectedDialogs();
    });

    window.addEventListener('offline', () => {
      console.log('الشبكة غير متاحة');
    });

    // التحقق من حالة الشبكة كل ثانية
    const checkNetwork = () => {
      if (navigator.onLine) {
        this.hideDisconnectedDialogs();
      }
    };

    const networkInterval = setInterval(checkNetwork, 1000);

    // التوقف بعد 30 ثانية
    setTimeout(() => {
      clearInterval(networkInterval);
    }, 30000);
  }

  // طريقة لإجبار إخفاء الرسائل
  forceHideErrorMessages(): void {
    this.hideDisconnectedDialogs();
  }

  // التحقق مما إذا كان التطبيق يعمل داخل appCreator24
  static isAppCreator24Environment(): boolean {
    return (
      window.location.hostname.includes('appcreator24.com') ||
      window.navigator.userAgent.includes('AppCreator24') ||
      document.title.includes('AppCreator24') ||
      (window as any).hasOwnProperty('appCreator24API')
    );
  }
}

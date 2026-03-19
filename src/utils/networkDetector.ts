/**
 * أدوات كشف وتشخيص حالة الشبكة
 */

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  canReachFirebase: boolean;
  canReachMonetag: boolean;
}

export class NetworkDetector {
  private static instance: NetworkDetector;
  private status: NetworkStatus = {
    isOnline: navigator.onLine,
    canReachFirebase: false,
    canReachMonetag: false
  };

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): NetworkDetector {
    if (!NetworkDetector.instance) {
      NetworkDetector.instance = new NetworkDetector();
    }
    return NetworkDetector.instance;
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.status.isOnline = true;
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.status.isOnline = false;
      this.notifyListeners();
    });
  }

  private listeners: ((status: NetworkStatus) => void)[] = [];

  addListener(listener: (status: NetworkStatus) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (status: NetworkStatus) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.status }));
  }

  async checkConnectivity(): Promise<NetworkStatus> {
    this.status.isOnline = navigator.onLine;

    // الحصول على معلومات الاتصال إذا كانت متاحة
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.status.connectionType = connection.type;
      this.status.effectiveType = connection.effectiveType;
      this.status.downlink = connection.downlink;
      this.status.rtt = connection.rtt;
    }

    // التحقق من الوصول إلى Firebase
    try {
      const firebaseResponse = await this.checkFirebaseConnectivity();
      this.status.canReachFirebase = firebaseResponse;
    } catch (error) {
      this.status.canReachFirebase = false;
    }

    // التحقق من الوصول إلى Monetag
    try {
      const monetagResponse = await this.checkMonetagConnectivity();
      this.status.canReachMonetag = monetagResponse;
    } catch (error) {
      this.status.canReachMonetag = false;
    }

    this.notifyListeners();
    return { ...this.status };
  }

  private async checkFirebaseConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://firebase.googleapis.com/', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return true;
    } catch (error) {
      // محاولة بديلة عبر Firebase REST API
      try {
        const response = await fetch('https://firestore.googleapis.com/', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  private async checkMonetagConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://5gvci.com/', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  getCurrentStatus(): NetworkStatus {
    return { ...this.status };
  }

  async waitForConnection(timeout: number = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkConnection = async () => {
        const status = await this.checkConnectivity();
        
        if (status.isOnline && status.canReachFirebase) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }
        
        setTimeout(checkConnection, 1000);
      };
      
      checkConnection();
    });
  }
}

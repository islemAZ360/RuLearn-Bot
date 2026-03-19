import React, { useState, useEffect } from 'react';
import { Bot, Wifi, WifiOff, RefreshCw, AlertTriangle, Shield } from 'lucide-react';
import { NetworkDetector, NetworkStatus } from '../utils/networkDetector';
import { RetryManager } from '../utils/retryManager';
import { APP_CONFIG, getErrorMessage, requiresVPN } from '../config/appConfig';

interface EnhancedLoadingProps {
  onLoadingComplete: () => void;
  onLoadingFailed: (error: string) => void;
}

export default function EnhancedLoading({ onLoadingComplete, onLoadingFailed }: EnhancedLoadingProps) {
  const [status, setStatus] = useState<'checking' | 'loading' | 'retrying' | 'failed'>('checking');
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string>('');

  const loadingSteps = APP_CONFIG.LOADING.STEPS;

  useEffect(() => {
    const networkDetector = NetworkDetector.getInstance();
    networkDetector.addListener(handleNetworkChange);
    
    startLoadingProcess();
    
    return () => {
      networkDetector.removeListener(handleNetworkChange);
    };
  }, []);

  const handleNetworkChange = (status: NetworkStatus) => {
    setNetworkStatus(status);
  };

  const startLoadingProcess = async () => {
    try {
      setStatus('checking');
      setCurrentStep(0);
      
      // التحقق من حالة الشبكة
      const networkStatus = await NetworkDetector.getInstance().checkConnectivity();
      setNetworkStatus(networkStatus);
      
      if (!networkStatus.isOnline) {
        throw new Error(APP_CONFIG.ERROR_MESSAGES.NETWORK_OFFLINE);
      }

      setStatus('loading');
      setCurrentStep(1);

      // محاولة الاتصال بـ Firebase مع إعادة المحاولة
      await RetryManager.executeWithRetryAndTimeout(
        async () => {
          if (!networkStatus.canReachFirebase) {
            // محاولة التحقق مرة أخرى
            const freshStatus = await NetworkDetector.getInstance().checkConnectivity();
            if (!freshStatus.canReachFirebase) {
              throw new Error(APP_CONFIG.ERROR_MESSAGES.FIREBASE_UNREACHABLE);
            }
          }
          // هنا سيتم تحميل Firebase الفعلي
          await new Promise(resolve => setTimeout(resolve, 1000)); // محاكاة التحميل
        },
        {
          maxRetries: APP_CONFIG.NETWORK.RETRY.MAX_RETRIES,
          baseDelay: APP_CONFIG.NETWORK.RETRY.BASE_DELAY,
          maxDelay: APP_CONFIG.NETWORK.RETRY.MAX_DELAY,
          backoffFactor: APP_CONFIG.NETWORK.RETRY.BACKOFF_FACTOR
        },
        APP_CONFIG.NETWORK.TIMEOUTS.FIREBASE_INIT
      );

      setCurrentStep(2);

      // تحميل الإعدادات
      await loadAppSettings();

      setCurrentStep(3);

      // تهيئة المصادقة
      await initializeAuth();

      setCurrentStep(4);

      // اكتمال التحميل
      setTimeout(() => {
        onLoadingComplete();
      }, 500);

    } catch (error) {
      console.error('فشل التحميل:', error);
      setErrorDetails(getErrorMessage(error));
      setStatus('failed');
      onLoadingFailed(getErrorMessage(error));
    }
  };

  const loadAppSettings = async () => {
    await RetryManager.executeWithTimeout(
      async () => {
        // تحميل الإعدادات من localStorage أو الخادم
        await new Promise(resolve => setTimeout(resolve, 800));
      },
      APP_CONFIG.NETWORK.TIMEOUTS.NETWORK_CHECK
    );
  };

  const initializeAuth = async () => {
    await RetryManager.executeWithTimeout(
      async () => {
        // تهيئة Firebase Auth
        await new Promise(resolve => setTimeout(resolve, 800));
      },
      APP_CONFIG.NETWORK.TIMEOUTS.AUTH_OPERATION
    );
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setStatus('retrying');
    setErrorDetails('');
    startLoadingProcess();
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'loading':
      case 'retrying':
        return <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      default:
        return <Bot className="w-6 h-6 text-indigo-500" />;
    }
  };

  const getNetworkStatusIcon = () => {
    if (!networkStatus) return null;
    
    if (networkStatus.isOnline && networkStatus.canReachFirebase) {
      return <Wifi className="w-4 h-4 text-green-500" />;
    } else {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* الخلفية المتحركة */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      
      {/* المحتوى الرئيسي */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full px-6">
        {/* الأيقونة والحالة */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
            <Bot className="w-10 h-10 text-white" strokeWidth={2} />
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h1 className="text-2xl font-bold text-white">RuLearn</h1>
          </div>
        </div>

        {/* حالة الشبكة */}
        {networkStatus && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/50 px-3 py-2 rounded-full">
            {getNetworkStatusIcon()}
            <span>
              {networkStatus.isOnline ? 'متصل' : 'غير متصل'}
              {networkStatus.canReachFirebase ? ' • Firebase متاح' : ' • Firebase غير متاح'}
            </span>
          </div>
        )}

        {/* شريط التقدم */}
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-indigo-500 to-violet-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / (loadingSteps.length - 1)) * 100}%` }}
          />
        </div>

        {/* خطوة التحميل الحالية */}
        <div className="text-center">
          <p className="text-slate-300 font-medium">
            {loadingSteps[Math.min(currentStep, loadingSteps.length - 1)]}
          </p>
          {status === 'retrying' && (
            <p className="text-slate-500 text-sm mt-1">
              إعادة المحاولة {retryCount + 1}...
            </p>
          )}
        </div>

        {/* رسالة الخطأ */}
        {status === 'failed' && (
          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm text-center mb-3">
              {errorDetails}
            </p>
            
            {requiresVPN({ message: errorDetails }) && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 text-blue-400 text-xs">
                  <Shield className="w-4 h-4" />
                  <span>قد تحتاج إلى تشغيل VPN للوصول إلى التطبيق في منطقتك</span>
                </div>
              </div>
            )}
            
            <button
              onClick={handleRetry}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* النقاط المتحركة */}
        {status !== 'failed' && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}
      </div>
    </div>
  );
}

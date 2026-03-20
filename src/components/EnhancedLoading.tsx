import React, { useState, useEffect } from 'react';
import { Bot, Wifi, WifiOff, RefreshCw, AlertTriangle, Shield, Clock } from 'lucide-react';
import { APP_CONFIG, getErrorMessage, requiresVPN } from '../config/appConfig';

interface EnhancedLoadingProps {
  onLoadingComplete: () => void;
  onLoadingFailed: (error: string) => void;
}

export default function EnhancedLoading({ onLoadingComplete, onLoadingFailed }: EnhancedLoadingProps) {
  const [status, setStatus] = useState<'loading' | 'failed'>('loading');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    startLoadingProcess();

    // Show slow message after 4 seconds
    const slowTimer = setTimeout(() => {
      setShowSlowMessage(true);
    }, 4000);
    
    return () => {
      clearTimeout(slowTimer);
    };
  }, []);

  const startLoadingProcess = async () => {
    try {
      // Quick online check — no artificial delays
      if (!navigator.onLine) {
        throw new Error(APP_CONFIG.ERROR_MESSAGES.NETWORK_OFFLINE);
      }

      // Go straight to completion
      onLoadingComplete();
    } catch (error) {
      console.error('Loading failed:', error);
      setErrorDetails(getErrorMessage(error));
      setStatus('failed');
      onLoadingFailed(getErrorMessage(error));
    }
  };

  const handleRetry = () => {
    setStatus('loading');
    setErrorDetails('');
    setShowSlowMessage(false);
    startLoadingProcess();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full px-6">
        {/* Icon */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
            <Bot className="w-10 h-10 text-white" strokeWidth={2} />
          </div>
          
          <div className="flex items-center gap-2">
            {status === 'failed' 
              ? <AlertTriangle className="w-6 h-6 text-red-500" />
              : <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            }
            <h1 className="text-2xl font-bold text-white">RuLearn</h1>
          </div>
        </div>

        {/* Loading state */}
        {status === 'loading' && (
          <>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-violet-600 h-full animate-pulse w-full" />
            </div>

            <p className="text-slate-300 font-medium">Loading...</p>

            {/* Slow loading message */}
            {showSlowMessage && (
              <div className="flex items-center gap-2 text-sm text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5">
                <Clock className="w-4 h-4 shrink-0" />
                <span>This is taking longer than usual. Please wait...</span>
              </div>
            )}

            {/* Animated dots */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </>
        )}

        {/* Error state */}
        {status === 'failed' && (
          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm text-center mb-3">{errorDetails}</p>
            
            {requiresVPN({ message: errorDetails }) && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 text-blue-400 text-xs">
                  <Shield className="w-4 h-4" />
                  <span>You may need to enable a VPN to access the app in your region</span>
                </div>
              </div>
            )}
            
            <button
              onClick={handleRetry}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

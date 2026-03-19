import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Bot, Sparkles, Loader2, ExternalLink, Copy, Check } from 'lucide-react';

// Detect if running in WebView/in-app browser
function isWebView(): boolean {
  const ua = navigator.userAgent || '';
  
  // Common WebView indicators
  if (/FBAN|FBAV|Instagram|Twitter|Telegram|Line|KAKAOTALK|Snapchat|WebView|wv/i.test(ua)) {
    return true;
  }
  
  // iOS WebView (not Safari)
  if (/iPad|iPhone|iPod/.test(ua) && !/Safari/.test(ua)) {
    return true;
  }
  
  return false;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inWebView, setInWebView] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const appUrl = 'https://learn-bot.vercel.app';

  useEffect(() => {
    setInWebView(isWebView());
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = appUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInBrowser = () => {
    // Try Android intent first
    const intentUrl = `intent://${appUrl.replace('https://', '')}#Intent;scheme=https;package=com.android.chrome;end`;
    
    // Create a hidden link and click it
    const link = document.createElement('a');
    link.href = intentUrl;
    link.click();
    
    // Show instructions as fallback
    setShowInstructions(true);
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (popupError: any) {
      console.error('Login failed:', popupError);
      setShowInstructions(true);
      setInWebView(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/10 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-black/50 border border-white/10 p-10 text-center space-y-10">
          
          <div className="flex justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-500 blur-2xl opacity-40 rounded-full"></div>
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/30 relative z-10 border border-white/20">
              <Bot className="w-12 h-12 text-white" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-2 -right-2 bg-slate-900 rounded-full p-1.5 border border-slate-700 z-20">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold text-white tracking-tight">RuLearn</h1>
            <p className="text-slate-400 font-medium text-lg">Your Personal AI Telegram Manager</p>
          </div>

          <div className="pt-4 space-y-4">
            {showInstructions && (
              <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-200 text-sm space-y-3">
                <p className="font-bold text-base">⚠️ تسجيل الدخول غير مدعوم هنا</p>
                <p>لتسجيل الدخول، اتبع الخطوات:</p>
                <ol className="list-decimal list-inside space-y-1 text-amber-100">
                  <li>اضغط على النقاط الثلاث (⋮) أعلى الشاشة</li>
                  <li>اختر <strong>"Open in Chrome"</strong> أو <strong>"Open in Browser"</strong></li>
                  <li>سجّل الدخول من المتصفح</li>
                </ol>
              </div>
            )}

            {error && !showInstructions && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}
            
            {(inWebView || showInstructions) && (
              <div className="space-y-3">
                <button
                  onClick={handleOpenInBrowser}
                  className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-500 transition-all duration-300 py-4 px-6 rounded-2xl font-bold shadow-xl"
                >
                  <ExternalLink className="w-5 h-5" />
                  فتح في Chrome
                </button>
                
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-3 bg-slate-700 text-white hover:bg-slate-600 transition-all duration-300 py-3 px-6 rounded-2xl font-medium"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'تم النسخ!' : 'نسخ الرابط'}
                </button>
                
                <p className="text-slate-400 text-xs text-center">
                  {appUrl}
                </p>
              </div>
            )}
            
            <button
              onClick={handleLogin}
              disabled={loading}
              className="group w-full flex items-center justify-center gap-3 bg-white text-slate-800 hover:bg-slate-50 transition-all duration-300 py-4 px-6 rounded-2xl font-bold shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              )}
              {loading ? 'جاري التسجيل...' : 'Continue with Google'}
            </button>
            <p className="text-slate-500 text-sm mt-6 font-medium">
              Secure authentication powered by Firebase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Bot, Sparkles, Loader2, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Translate common Firebase errors to Arabic
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('هذا البريد الإلكتروني مستخدم بالفعل');
          break;
        case 'auth/invalid-email':
          setError('البريد الإلكتروني غير صحيح');
          break;
        case 'auth/weak-password':
          setError('كلمة السر ضعيفة - يجب أن تكون 6 أحرف على الأقل');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('البريد الإلكتروني أو كلمة السر غير صحيحة');
          break;
        case 'auth/too-many-requests':
          setError('محاولات كثيرة - حاول لاحقاً');
          break;
        default:
          setError('حدث خطأ. حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/10 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-black/50 border border-white/10 p-8 text-center space-y-6">
          
          {/* Logo */}
          <div className="flex justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-500 blur-2xl opacity-40 rounded-full"></div>
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 relative z-10 border border-white/20">
              <Bot className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-1 border border-slate-700 z-20">
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
          </div>
          
          {/* Title */}
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">RuLearn</h1>
            <p className="text-slate-400 font-medium">{isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                required
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة السر"
                required
                minLength={6}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-3 px-6 rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                <UserPlus className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? 'جاري...' : isSignUp ? 'إنشاء حساب' : 'دخول'}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              {isSignUp ? 'لديك حساب؟ ' : 'ليس لديك حساب؟ '}
              <span className="text-indigo-400 font-semibold">
                {isSignUp ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

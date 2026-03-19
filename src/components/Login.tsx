import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { enhancedFirebase } from '../services/enhancedFirebase';
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
      const auth = enhancedFirebase.getAuth();
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Handle common Firebase errors
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already in use');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/weak-password':
          setError('Password is too weak - must be at least 6 characters');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts - please try again later');
          break;
        default:
          setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 animate-fade-in">
        <div className="bg-white/5 backdrop-blur-2xl rounded-[2rem] shadow-2xl shadow-black/50 border border-white/10 p-8 text-center space-y-6">
          
          {/* Logo */}
          <div className="flex justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-500 blur-3xl opacity-30 rounded-full scale-150"></div>
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 relative z-10 border border-white/20 animate-float">
              <Bot className="w-10 h-10 text-white drop-shadow-lg" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-1.5 border border-slate-700 z-20 shadow-lg">
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">RuLearn</h1>
            <p className="text-slate-400 font-medium text-sm">{isSignUp ? 'Create a new account' : 'Sign in to your account'}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2 animate-scale-in">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
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
                placeholder="Email address"
                required
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all hover:border-slate-600"
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all hover:border-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white py-3.5 px-6 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                <UserPlus className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="pt-4 border-t border-slate-800/50">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-slate-400 hover:text-white text-sm transition-all hover:tracking-wide"
            >
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <span className="text-indigo-400 font-semibold hover:text-indigo-300">
                {isSignUp ? 'Sign In' : 'Create Account'}
              </span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-slate-600 text-xs pt-2">
            Secure authentication powered by Firebase
          </p>
        </div>
      </div>
    </div>
  );
}

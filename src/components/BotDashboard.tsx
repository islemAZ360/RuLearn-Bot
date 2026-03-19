import React, { useEffect, useState } from 'react';
import { Play, Square, Activity, Terminal } from 'lucide-react';
import { startBot, stopBot, getBotStatus, getLogs, setLogListener, LogEntry } from '../services/telegram';

export default function BotDashboard() {
  const [isRunning, setIsRunning] = useState(getBotStatus());
  const [logs, setLogs] = useState<LogEntry[]>(getLogs());

  useEffect(() => {
    setLogListener(() => {
      setLogs([...getLogs()]);
    });
    return () => setLogListener(() => {});
  }, []);

  const handleStart = () => {
    startBot();
    setIsRunning(true);
  };

  const handleStop = () => {
    stopBot();
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-10 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-2 md:p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Activity size={20} className="md:w-6 md:h-6" strokeWidth={2.5} />
            </div>
            Bot Control Center
          </h2>
          <p className="text-sm md:text-base text-slate-500 mt-2 font-medium">Manage your Telegram bot instance and monitor real-time activity.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {!isRunning ? (
            <button onClick={handleStart} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 active:scale-95 font-bold tracking-wide">
              <Play size={20} fill="currentColor" /> Start Engine
            </button>
          ) : (
            <button onClick={handleStop} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/30 hover:shadow-rose-500/40 active:scale-95 font-bold tracking-wide">
              <Square size={20} fill="currentColor" /> Stop Engine
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col relative">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
          </div>
          <div className="flex items-center gap-3">
            <Terminal size={14} className="text-slate-500" />
            <span className="text-xs font-mono text-slate-400">system_logs.sh</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`}></div>
            <span className={`text-xs font-bold uppercase tracking-wider ${isRunning ? 'text-emerald-500' : 'text-slate-500'}`}>
              {isRunning ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        {/* Terminal Body */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-slate-950 text-slate-300 relative">
          {/* Subtle grid background for terminal */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          <div className="relative z-10">
            {logs.length === 0 ? (
              <div className="text-slate-600 h-full flex flex-col items-center justify-center mt-20 space-y-4">
                <Terminal size={48} className="text-slate-800" />
                <p>Awaiting initialization sequence...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, i) => (
                  <div key={i} className={`p-3 rounded-lg border backdrop-blur-sm transition-all ${
                    log.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 
                    log.type === 'msg' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 
                    'bg-slate-800/30 border-slate-700/30 text-slate-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <span className="text-slate-500 text-xs mt-0.5 shrink-0">[{log.time.toLocaleTimeString()}]</span>
                      <span className="leading-relaxed break-words">{log.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

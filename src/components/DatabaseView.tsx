import React, { useEffect, useState } from 'react';
import { Database, RefreshCw, Search, Calendar, Type } from 'lucide-react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function DatabaseView() {
  const [activeTab, setActiveTab] = useState<'sentences' | 'verbs' | 'words'>('sentences');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        setData([]);
        return;
      }
      const q = query(collection(db, activeTab), where('userId', '==', userId), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-2 md:p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Database size={20} className="md:w-6 md:h-6" strokeWidth={2.5} />
            </div>
            Knowledge Base
          </h2>
          <p className="text-sm md:text-base text-slate-500 mt-2 font-medium">Manage your saved translations, vocabulary, and grammar rules.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200 shadow-inner overflow-x-auto hide-scrollbar">
            {(['sentences', 'verbs', 'words'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg text-sm md:text-base font-bold capitalize transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button 
            onClick={fetchData} 
            className="flex items-center justify-center gap-2 p-2.5 bg-white text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl shadow-sm hover:shadow transition-all active:scale-95" 
            title="Refresh Data"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
            <span className="sm:hidden text-sm font-semibold">Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden flex flex-col relative">
        {/* Subtle top gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-20"></div>
        
        <div className="flex-1 overflow-auto p-0 relative">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
                <div className="w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="font-medium tracking-wide">Syncing records...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 bg-slate-50/50 p-6">
              <div className="p-6 bg-white rounded-full shadow-sm border border-slate-100 mb-2">
                <Database size={48} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-slate-700">No {activeTab} found</h3>
              <p className="text-slate-500 max-w-sm text-center text-sm md:text-base">You haven't saved any {activeTab} yet. Use your Telegram bot to start saving data!</p>
            </div>
          ) : (
            <div className="min-w-full inline-block align-middle">
              <table className="min-w-full text-left border-collapse">
                <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-200 backdrop-blur-md z-10">
                  <tr>
                    <th className="px-4 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Type size={14} className="text-indigo-400 hidden md:block" /> Russian
                    </th>
                    <th className="px-4 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                      Arabic Translation
                    </th>
                    <th className="px-4 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-extrabold text-slate-500 uppercase tracking-widest w-32 md:w-48">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-indigo-400 hidden md:block" /> Date Added
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-4 md:px-8 py-4 md:py-5 whitespace-pre-wrap text-xs md:text-sm text-slate-800 font-semibold group-hover:text-indigo-900 transition-colors">{item.ru}</td>
                      <td className="px-4 md:px-8 py-4 md:py-5 whitespace-pre-wrap text-xs md:text-sm text-slate-600 font-medium" dir="rtl">{item.ar}</td>
                      <td className="px-4 md:px-8 py-4 md:py-5 whitespace-nowrap text-[10px] md:text-xs text-slate-400 font-mono bg-slate-50/50 group-hover:bg-transparent transition-colors">
                        {new Date(item.timestamp).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

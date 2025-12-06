import React, { useState, useEffect, useMemo } from 'react';
import { ActivityType, DayOfWeek, ScheduleItem, AIAnalysisResult, ACTIVITY_COLORS } from './types';
import { ScheduleForm } from './components/ScheduleForm';
import { Dashboard } from './components/Dashboard';
import { analyzeScheduleWithAI } from './services/geminiService';


export default function App() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [tab, setTab] = useState<'input' | 'analysis'>('input');
  const [showApiKeyError, setShowApiKeyError] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('college-schedule');
    if (saved) {
      setSchedule(JSON.parse(saved));
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('college-schedule', JSON.stringify(schedule));
  }, [schedule]);

  const addScheduleItem = (item: ScheduleItem) => {
    setSchedule(prev => [...prev, item].sort((a, b) => {
        // Simple sort by Day then Start Time
        const days = Object.values(DayOfWeek);
        if (a.day !== b.day) return days.indexOf(a.day) - days.indexOf(b.day);
        return a.startTime.localeCompare(b.startTime);
    }));
  };

  const removeScheduleItem = (id: string) => {
    setSchedule(prev => prev.filter(i => i.id !== id));
  };


  // --- Algorithm Implementation (Deterministic) ---
  const calculatedStress = useMemo(() => {
    if (schedule.length === 0) return 0;

    let totalMinutes = 0;
    let workStudyMinutes = 0;
    let restMinutes = 0;
    
    // Total waking hours in a week approx 112 hours (16 * 7)
    const TOTAL_WAKING_MINUTES = 112 * 60; 

    schedule.forEach(item => {
      totalMinutes += item.durationMinutes;
      if ([ActivityType.CLASS, ActivityType.WORK, ActivityType.STUDY].includes(item.type)) {
        workStudyMinutes += item.durationMinutes;
      }
      if (item.type === ActivityType.REST) {
        restMinutes += item.durationMinutes;
      }
    });

    // 1. Density Score (How full is the schedule?)
    const densityRatio = Math.min(totalMinutes / TOTAL_WAKING_MINUTES, 1);
    const densityScore = densityRatio * 100 * 0.35; // Weight 35%

    // 2. Load Score (Work/Study burden)
    const loadRatio = Math.min(workStudyMinutes / (TOTAL_WAKING_MINUTES * 0.6), 1); // Expecting 60% max productivity
    const loadScore = loadRatio * 100 * 0.35; // Weight 35%

    // 3. Rest Deficiency Score
    // Ideal rest is ~15% of waking time (excluding sleep)
    const idealRest = TOTAL_WAKING_MINUTES * 0.15;
    const restDeficiency = Math.max(0, (idealRest - restMinutes) / idealRest);
    const restScore = restDeficiency * 100 * 0.30; // Weight 30%

    let total = densityScore + loadScore + restScore;
    
    // Penalties
    // Late night activities? (Simplified check: end time > 23:00)
    const lateNights = schedule.filter(i => parseInt(i.endTime.split(':')[0]) >= 23).length;
    total += lateNights * 2; 

    return Math.min(Math.round(total), 100);
  }, [schedule]);

  // --- AI Handler ---
  const handleAIAnalysis = async () => {
    if (!process.env.API_KEY) {
        setShowApiKeyError(true);
        return;
    }
    
    setIsLoadingAI(true);
    setTab('analysis');
    try {
      const result = await analyzeScheduleWithAI(schedule, calculatedStress);
      setAiResult(result);
    } catch (e) {
      console.error(e);
      alert("AI 分析連線失敗，請檢查網路或稍後再試。");
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <h1 className="font-bold text-gray-800 text-lg md:text-xl tracking-tight">UniStress 分析器 & 智慧助理</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full">
        
        {showApiKeyError && (
             <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r shadow-sm">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-red-700">
                            未偵測到 API Key。此功能需要設定 <code className="font-mono bg-red-100 px-1">process.env.API_KEY</code> 才能使用 AI 分析。
                            <br/>
                            目前僅能使用基礎演算法計算。
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 w-fit mx-auto">
          <button
            onClick={() => setTab('input')}
            className={`px-8 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'input' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            行程輸入
          </button>
          <button
            onClick={() => setTab('analysis')}
            className={`px-8 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === 'analysis' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <span>📊</span> 分析報告
          </button>
        </div>

        {tab === 'input' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                 <ScheduleForm onAdd={addScheduleItem} />
                 
                 <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden ring-1 ring-white/10">
                    <div className="relative z-10">
                        <p className="text-indigo-200 text-sm mb-1 font-medium tracking-wide">目前預估壓力</p>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-6xl font-bold tracking-tighter">{calculatedStress}</span>
                            <span className="text-indigo-300 text-lg">/ 100</span>
                        </div>
                        
                        <div className="h-3 bg-indigo-950/50 rounded-full overflow-hidden mb-3 border border-indigo-700/30">
                            <div 
                                className={`h-full transition-all duration-700 ease-out ${
                                    calculatedStress > 70 ? 'bg-gradient-to-r from-red-500 to-pink-500' : 
                                    calculatedStress > 40 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                                    'bg-gradient-to-r from-emerald-400 to-teal-500'
                                }`}
                                style={{ width: `${calculatedStress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-indigo-100 font-medium">
                            {calculatedStress > 70 ? '同學，你需要休息...' : calculatedStress > 40 ? '還撐得住嗎？' : '這週過得很愜意喔！'}
                        </p>
                    </div>
                    {/* Decorative Blob */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600 rounded-full opacity-30 blur-2xl"></div>
                 </div>
                 
                 <button 
                    onClick={handleAIAnalysis}
                    className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white p-4 rounded-xl shadow-lg shadow-indigo-200 font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                 >
                    <span className="text-xl group-hover:rotate-12 transition-transform">✨</span> 產生完整分析報告
                 </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-5">
               <div className="flex items-center justify-between px-1">
                    <h3 className="text-lg font-bold text-gray-700">本週行程總覽 <span className="text-gray-400 font-normal ml-2">({schedule.length})</span></h3>
               </div>
               
               {schedule.length === 0 ? (
                   <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400 flex flex-col items-center">
                       <div className="text-4xl mb-4 opacity-50">📅</div>
                       <p>還沒有行程，趕快新增吧！</p>
                   </div>
               ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                    {Object.values(DayOfWeek).map(day => {
                        const dayItems = schedule.filter(i => i.day === day);
                        if (dayItems.length === 0) return null;
                        return (
                            <div key={day} className="p-5 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 pt-1">
                                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider bg-gray-100 rounded px-2 py-1 text-center">{day}</h4>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        {dayItems.map(item => (
                                            <div key={item.id} className="flex items-center group bg-white border border-gray-100 rounded-lg p-3 hover:shadow-md hover:border-indigo-100 transition-all relative">
                                                <div 
                                                    className="w-1.5 self-stretch rounded-full mr-4"
                                                    style={{ backgroundColor: ACTIVITY_COLORS[item.type] }}
                                                ></div>
                                                <div className="w-24 text-sm font-mono text-gray-500 border-r border-gray-100 mr-4 pr-4">
                                                    {item.startTime} - {item.endTime}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-gray-800 truncate">{item.name}</div>
                                                        <span className="px-2 py-0.5 rounded-full bg-gray-50 text-xs text-gray-500 border border-gray-100 whitespace-nowrap">{item.type}</span>
                                                    </div>
                                                    {item.note && <div className="text-xs text-gray-400 mt-0.5 truncate">{item.note}</div>}
                                                </div>
                                                <button 
                                                    onClick={() => removeScheduleItem(item.id)}
                                                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 absolute right-2"
                                                    title="刪除"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
               )}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in max-w-5xl mx-auto space-y-8">
             
             {/* Charts */}
             <Dashboard schedule={schedule} />

             {isLoadingAI ? (
                 <div className="bg-white p-16 rounded-xl shadow-sm border border-gray-100 text-center">
                     <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                     </div>
                     <h3 className="text-lg font-bold text-gray-800 mb-2">AI 正在整理你的行程...</h3>
                     <p className="text-gray-500">正在計算壓力指數並生成智慧助理報告</p>
                 </div>
             ) : aiResult ? (
                 <>
                    {/* Stress Analysis Card */}
                    <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 md:p-10 text-white relative overflow-hidden">
                             {/* AI Badge for Stress Card */}
                            <div className="absolute top-6 right-6 z-20">
                                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm">
                                    <svg className="w-3 h-3 text-yellow-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                                    AI 協作分析
                                </span>
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="max-w-xl">
                                    <h2 className="text-3xl font-bold mb-3">AI 壓力檢測</h2>
                                    <div className="text-indigo-100 text-lg leading-relaxed italic">
                                        "{aiResult.encouragement}"
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl text-center min-w-[140px] border border-white/20 shadow-lg">
                                    <div className="text-xs uppercase tracking-widest opacity-80 mb-2">AI 壓力指數</div>
                                    <div className="text-5xl font-black">{aiResult.stressScore}</div>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                        </div>
                        
                        <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                                <h4 className="font-bold text-gray-800 mb-5 flex items-center gap-3 text-lg">
                                    <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500">⚠️</span> 
                                    潛在風險
                                </h4>
                                <ul className="space-y-4">
                                    {aiResult.riskFactors.map((risk, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-gray-700 bg-red-50/50 p-4 rounded-xl border border-red-100/50 hover:bg-red-50 transition-colors">
                                            <span className="text-red-400 mt-1">•</span> 
                                            <span>{risk}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="font-bold text-gray-800 mb-5 flex items-center gap-3 text-lg">
                                    <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">💡</span> 
                                    改善建議
                                </h4>
                                <ul className="space-y-4">
                                    {aiResult.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-gray-700 bg-green-50/50 p-4 rounded-xl border border-green-100/50 hover:bg-green-50 transition-colors">
                                            <div className="w-6 h-6 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{idx + 1}</div>
                                            <span>{suggestion}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* New: Smart Assistant Report */}
                    <div>
                         <div className="flex items-center gap-3 mb-6">
                            <span className="text-3xl">📅</span>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-gray-800">智慧助理報告</h2>
                                {/* AI Badge for Assistant */}
                                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                                    ✨ AI Generated
                                </span>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Card 1: Weekly Summary */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm md:col-span-2 lg:col-span-1 hover:shadow-md transition-shadow">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">📌</span>
                                    本週重點摘要
                                </h4>
                                <p className="text-gray-600 leading-relaxed">
                                    {aiResult.weeklySummary}
                                </p>
                            </div>

                             {/* Card 2: Important Events */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm md:col-span-2 lg:col-span-2 hover:shadow-md transition-shadow">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="bg-purple-100 text-purple-600 p-1.5 rounded-lg">⭐</span>
                                    重要時間整理
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {aiResult.importantEvents.length > 0 ? (
                                        aiResult.importantEvents.map((event, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="bg-white border border-gray-200 rounded px-3 py-1 text-center min-w-[60px]">
                                                    <div className="text-xs font-bold text-gray-400 uppercase">{event.date}</div>
                                                    <div className="text-sm font-bold text-gray-800">{event.time}</div>
                                                </div>
                                                <div className="font-medium text-gray-700">{event.title}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-gray-400 italic p-2">本週沒有特別標註的重要事件。</div>
                                    )}
                                </div>
                            </div>

                             {/* Card 3: To-Do List */}
                             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="bg-orange-100 text-orange-600 p-1.5 rounded-lg">📝</span>
                                    推測待辦事項
                                </h4>
                                <ul className="space-y-3">
                                    {aiResult.todoList.length > 0 ? aiResult.todoList.map((todo, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="mt-1 w-4 h-4 rounded-full border-2 border-orange-200"></div>
                                            <span className="text-gray-600 text-sm">{todo}</span>
                                        </li>
                                    )) : <li className="text-gray-400 italic text-sm">無需待辦事項。</li>}
                                </ul>
                            </div>

                            {/* Card 4: Reminders */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm md:col-span-1 lg:col-span-2 hover:shadow-md transition-shadow">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="bg-pink-100 text-pink-600 p-1.5 rounded-lg">🔔</span>
                                    遺漏提醒 & 備註檢查
                                </h4>
                                {aiResult.reminders.length > 0 ? (
                                    <div className="bg-pink-50 border border-pink-100 rounded-lg p-4">
                                        <ul className="space-y-2">
                                            {aiResult.reminders.map((reminder, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-pink-700 text-sm font-medium">
                                                    <span>💡</span>
                                                    <span>{reminder}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="text-gray-400 italic text-sm">備註中看起來沒有特別需要提醒的事項。</div>
                                )}
                            </div>
                         </div>
                    </div>
                 </>
             ) : (
                 <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm max-w-3xl mx-auto">
                     <div className="text-7xl mb-6 animate-bounce">🤖</div>
                     <h3 className="text-2xl font-bold text-gray-800 mb-3">尚未進行 AI 分析</h3>
                     <p className="text-gray-500 mb-8 max-w-md mx-auto">讓 AI 幫你檢視行程壓力，並自動整理待辦事項與重要提醒！</p>
                     <button 
                        onClick={handleAIAnalysis}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 font-bold text-lg hover:-translate-y-1"
                     >
                        開始分析
                     </button>
                 </div>
             )}
          </div>
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-8">
          <div className="max-w-6xl mx-auto px-4 text-center">
              <p className="text-gray-400 text-sm mb-2">
                本專案使用 <a href="https://ai.google.dev/" target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-600 underline">Google Gemini API</a> 進行 AI 協作分析。
              </p>
              <p className="text-xs text-gray-300">
                AI 生成內容僅供參考，請依實際情況評估。 | Vibe Coding Project Demo
              </p>
          </div>
      </footer>
    </div>
  );
}
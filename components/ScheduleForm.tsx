import React, { useState } from 'react';
import { ActivityType, DayOfWeek, ScheduleItem } from '../types';

interface Props {
  onAdd: (item: ScheduleItem) => void;
}

export const ScheduleForm: React.FC<Props> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [day, setDay] = useState<DayOfWeek>(DayOfWeek.MON);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [type, setType] = useState<ActivityType>(ActivityType.CLASS);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const calculateDuration = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const duration = calculateDuration(startTime, endTime);
    
    if (duration <= 0) {
      setError("結束時間必須晚於開始時間！");
      return;
    }

    const newItem: ScheduleItem = {
      id: generateId(),
      name: name || type, // Default name to type if empty
      day,
      startTime,
      endTime,
      type,
      note,
      durationMinutes: duration,
    };

    onAdd(newItem);
    
    // Reset Name and Note only, keep day/time for rapid entry
    setName('');
    setNote('');
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center border-b border-gray-100 pb-4">
        <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </span>
        新增行程
      </h3>
      
      <div className="space-y-5">
        
        {/* Row 1: Activity Name */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">活動名稱</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：微積分、系烤"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Row 2: Type & Day */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">類型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              {Object.values(ActivityType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">星期</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as DayOfWeek)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              {Object.values(DayOfWeek).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">開始時間</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">結束時間</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Row 4: Note */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">備註 (選填)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：教室 302、記得帶講義"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
          />
        </div>

        {error && (
            <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                ⚠️ {error}
            </div>
        )}

      </div>

      <button
        type="submit"
        className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg transition-colors shadow-lg shadow-indigo-200 text-base"
      >
        加入行程
      </button>
    </form>
  );
};
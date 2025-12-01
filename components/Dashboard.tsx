import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ActivityType, ScheduleItem, ACTIVITY_COLORS, DayOfWeek } from '../types';

interface Props {
  schedule: ScheduleItem[];
}

export const Dashboard: React.FC<Props> = ({ schedule }) => {
  // 1. Prepare Data for Pie Chart (Type Distribution)
  const typeDataRaw = schedule.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + item.durationMinutes;
    return acc;
  }, {} as Record<ActivityType, number>);

  const typeData = Object.keys(typeDataRaw).map((key) => ({
    name: key,
    value: typeDataRaw[key as ActivityType],
  })).filter(d => d.value > 0);

  // 2. Prepare Data for Bar Chart (Daily Load in Hours)
  const dayOrder = Object.values(DayOfWeek);
  const dailyDataRaw = schedule.reduce((acc, item) => {
    acc[item.day] = (acc[item.day] || 0) + item.durationMinutes;
    return acc;
  }, {} as Record<string, number>);

  const dailyData = dayOrder.map(day => ({
    name: day,
    hours: parseFloat(((dailyDataRaw[day] || 0) / 60).toFixed(1)),
  }));

  // Custom Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-lg rounded text-sm">
          <p className="font-bold">{payload[0].name}</p>
          <p>{Math.round(payload[0].value / 60)} 小時 ({payload[0].value} 分鐘)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Type Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">本週時間分配</h3>
        <div className="h-64 w-full">
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ACTIVITY_COLORS[entry.name as ActivityType]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">尚無資料</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {typeData.map(d => (
                <div key={d.name} className="flex items-center text-xs text-gray-600">
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: ACTIVITY_COLORS[d.name as ActivityType]}}></span>
                    {d.name}
                </div>
            ))}
        </div>
      </div>

      {/* Daily Load */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">每日忙碌程度 (小時)</h3>
        <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell
} from 'recharts';

export default function StatsChart({ projects, resources }) {
  const data = projects.map(p => ({
    name: p.name,
    count: resources.filter(r => r.projectId === p.id).length,
    color: p.color
  })).sort((a, b) => b.count - a.count);

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-full text-[#9B9B9B] text-sm italic">
      No data to visualize yet.
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#9B9B9B', fontSize: 10, fontWeight: 700 }}
          dy={10}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: '#FFF8E7' }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white border border-[#F0EBD8] p-3 rounded-xl shadow-xl">
                  <p className="text-xs font-bold text-[#1A1A1A] mb-1">{payload[0].payload.name}</p>
                  <p className="text-[10px] font-black text-[#F5A623] uppercase tracking-widest">
                    {payload[0].value} Resources
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar 
          dataKey="count" 
          radius={[6, 6, 0, 0]} 
          barSize={40}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

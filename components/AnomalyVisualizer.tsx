import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar
} from 'recharts';
import { UFOSighting } from '../types';
import SafeResponsiveContainer from './SafeResponsiveContainer';

interface Props {
  sightings: UFOSighting[];
}

export const AnomalyVisualizer: React.FC<Props> = ({ sightings }) => {
  const categoryData = sightings.reduce((acc, curr) => {
    const category = curr.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));
  
  const temporalData = sightings.map(s => ({
    name: new Date(s.timestamp).toLocaleDateString(),
    value: 1
  })).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-black/40 rounded-3xl border border-white/5">
      <div className="h-64 min-w-0 flex flex-col" style={{ minHeight: '200px', minWidth: '100%' }}>
        <h4 className="text-sm font-display font-black text-white uppercase tracking-[0.2em] mb-4">Anomaly Frequency (Temporal)</h4>
        <SafeResponsiveContainer minWidth={100} minHeight={200}>
          <LineChart data={temporalData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#00ff9d" strokeWidth={2} />
          </LineChart>
        </SafeResponsiveContainer>
      </div>
      <div className="h-64 min-w-0 flex flex-col" style={{ minHeight: '200px', minWidth: '100%' }}>
        <h4 className="text-sm font-display font-black text-white uppercase tracking-[0.2em] mb-4">Anomalies by Category</h4>
        <SafeResponsiveContainer minWidth={100} minHeight={200}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" hide />
            <Tooltip />
            <Bar dataKey="value" fill="#00ff9d" />
          </BarChart>
        </SafeResponsiveContainer>
      </div>
    </div>
  );
};


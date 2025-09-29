import React from 'react';
import type { Campaign, Contact } from '../types';
import { MessageStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  campaigns: Campaign[];
  contacts: Contact[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="text-primary">{icon}</div>
    </div>
    <p className="mt-2 text-3xl font-bold">{value}</p>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ campaigns, contacts }) => {
  const totalMessagesSent = campaigns.reduce((acc, c) => acc + (c.logs?.filter(l => l.status === MessageStatus.Sent).length || 0), 0);
  const totalMessagesFailed = campaigns.reduce((acc, c) => acc + (c.logs?.filter(l => l.status === MessageStatus.Failed).length || 0), 0);
  
  const campaignData = campaigns.map(c => ({
    name: c.name,
    sent: c.logs?.filter(l => l.status === MessageStatus.Sent).length || 0,
    failed: c.logs?.filter(l => l.status === MessageStatus.Failed).length || 0,
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's a summary of your activities.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Campaigns" value={campaigns.length} icon={<i className="fas fa-comment-dots fa-xl"></i>} />
        <StatCard title="Total Contacts" value={contacts.length} icon={<i className="fas fa-users fa-xl"></i>} />
        <StatCard title="Messages Sent" value={totalMessagesSent} icon={<i className="fas fa-paper-plane fa-xl"></i>} />
        <StatCard title="Messages Failed" value={totalMessagesFailed} icon={<i className="fas fa-exclamation-triangle fa-xl text-destructive"></i>} />
      </div>

      <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Campaign Performance</h2>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#005d5b" />
                <Bar dataKey="failed" fill="#ef4444" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
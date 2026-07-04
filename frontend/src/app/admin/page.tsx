'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { ShieldAlert, Users, FileText, Mail, Heart, RefreshCw, Trash2, Cpu, HardDrive } from 'lucide-react';
import { API_URL, getHeaders } from '../../config/api';

interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { scans: number };
}

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  user?: { email: string } | null;
}

interface FeedbackRecord {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

interface SystemStats {
  userCount: number;
  scanCount: number;
  logCount: number;
  feedbackCount: number;
}

interface SystemInfo {
  cpuCount: number;
  cpuLoad5Min: number;
  memoryTotalGB: number;
  memoryUsedGB: number;
  memoryUsagePercent: number;
  platform: string;
  uptimeHours: number;
}

export default function AdminPage() {
  const [activeSubTab, setActiveSubTab] = useState<'health' | 'users' | 'logs' | 'feedback'>('health');

  // Admin Data States
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, [activeSubTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeSubTab === 'health') {
        const response = await fetch(`${API_URL}/admin/stats`, { headers: getHeaders() });
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
          setSystemInfo(data.systemInfo);
        }
      } else if (activeSubTab === 'users') {
        const response = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
        const data = await response.json();
        if (data.success) setUsers(data.users);
      } else if (activeSubTab === 'logs') {
        const response = await fetch(`${API_URL}/admin/logs`, { headers: getHeaders() });
        const data = await response.json();
        if (data.success) setLogs(data.logs);
      } else if (activeSubTab === 'feedback') {
        const response = await fetch(`${API_URL}/admin/feedback`, { headers: getHeaders() });
        const data = await response.json();
        if (data.success) setFeedback(data.feedback);
      }
    } catch {
      setError('Access denied or backend offline. Verify your account has administrator role.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this user? This removes all their scan history recursively.')) return;
    try {
      const response = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== id));
      } else {
        alert(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setFeedback(prev => prev.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error('Delete feedback error:', err);
    }
  };

  return (
    <Sidebar>
      <div className="space-y-8">
        
        {/* Title */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-white font-mono tracking-wide">ADMINISTRATOR CONTROL</h1>
            <p className="text-sm text-slate-400">System health statistics, database user lists, and audit log monitors</p>
          </div>
          <button 
            onClick={fetchAdminData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-900 gap-6">
          <button 
            onClick={() => setActiveSubTab('health')}
            className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeSubTab === 'health' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
          >
            SYSTEM HEALTH
          </button>
          <button 
            onClick={() => setActiveSubTab('users')}
            className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeSubTab === 'users' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
          >
            USER RECORDS ({users.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('logs')}
            className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeSubTab === 'logs' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
          >
            AUDIT LOGS
          </button>
          <button 
            onClick={() => setActiveSubTab('feedback')}
            className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeSubTab === 'feedback' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
          >
            FEEDBACK INBOX
          </button>
        </div>

        {/* SUBTAB 1: HEALTH */}
        {activeSubTab === 'health' && stats && systemInfo && (
          <div className="space-y-8">
            {/* Overview Counters */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="glass-panel p-6 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Total Users</h3>
                  <p className="text-3xl font-extrabold text-white mt-1">{stats.userCount}</p>
                </div>
                <Users className="w-8 h-8 text-cyber-blue/80" />
              </div>
              <div className="glass-panel p-6 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Footprints Scanned</h3>
                  <p className="text-3xl font-extrabold text-white mt-1">{stats.scanCount}</p>
                </div>
                <FileText className="w-8 h-8 text-cyber-teal/80" />
              </div>
              <div className="glass-panel p-6 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Audit Log Count</h3>
                  <p className="text-3xl font-extrabold text-white mt-1">{stats.logCount}</p>
                </div>
                <ShieldAlert className="w-8 h-8 text-cyber-purple/80" />
              </div>
              <div className="glass-panel p-6 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Feedback Inbox</h3>
                  <p className="text-3xl font-extrabold text-white mt-1">{stats.feedbackCount}</p>
                </div>
                <Mail className="w-8 h-8 text-cyber-neon/80" />
              </div>
            </div>

            {/* RAM & CPU details */}
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* RAM box */}
              <div className="glass-panel p-6 border border-cyber-blue/15 space-y-6">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider border-b border-slate-900 pb-2 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyber-blue" /> RAM Usage Monitor
                </h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-2xl font-extrabold text-white">{systemInfo.memoryUsedGB} GB</p>
                    <p className="text-xs text-slate-500 font-mono">USED OF {systemInfo.memoryTotalGB} GB TOTAL</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-mono font-bold text-cyber-blue text-sm">
                    {systemInfo.memoryUsagePercent}%
                  </div>
                </div>
                {/* ProgressBar */}
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-cyber-blue h-2 rounded-full" style={{ width: `${systemInfo.memoryUsagePercent}%` }}></div>
                </div>
              </div>

              {/* CPU & Platform Info */}
              <div className="glass-panel p-6 border border-cyber-blue/15 space-y-4">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider border-b border-slate-900 pb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyber-teal" /> CPU Core Loadings
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-slate-950/40 p-3 border border-slate-900 rounded-lg">
                    <p className="text-slate-500">CPU CORE COUNT</p>
                    <p className="text-base font-bold text-white mt-1">{systemInfo.cpuCount} CORES</p>
                  </div>
                  <div className="bg-slate-950/40 p-3 border border-slate-900 rounded-lg">
                    <p className="text-slate-500">LOAD AVG (5 MIN)</p>
                    <p className="text-base font-bold text-white mt-1">{systemInfo.cpuLoad5Min}</p>
                  </div>
                  <div className="bg-slate-950/40 p-3 border border-slate-900 rounded-lg">
                    <p className="text-slate-500">PLATFORM OS</p>
                    <p className="text-base font-bold text-white mt-1 uppercase">{systemInfo.platform}</p>
                  </div>
                  <div className="bg-slate-950/40 p-3 border border-slate-900 rounded-lg">
                    <p className="text-slate-500">SYSTEM UPTIME</p>
                    <p className="text-base font-bold text-white mt-1">{systemInfo.uptimeHours} HOURS</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUBTAB 2: USERS LIST */}
        {activeSubTab === 'users' && (
          <div className="glass-panel p-6 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-400 text-left">
                <thead className="text-xs uppercase text-slate-500 font-mono border-b border-slate-900">
                  <tr>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 font-mono">Created Date</th>
                    <th className="py-3 px-4 font-mono">Scan Count</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-mono text-xs">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/20">
                      <td className="py-3 px-4 font-bold text-white">{u.name || 'Anonymous User'}</td>
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 border rounded text-[10px] font-bold ${
                          u.role === 'ADMIN' ? 'bg-cyber-purple/10 border-cyber-purple text-cyber-purple' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-bold">{u._count.scans} scans</td>
                      <td className="py-3 px-4 text-right">
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3: AUDIT LOGS */}
        {activeSubTab === 'logs' && (
          <div className="glass-panel p-6 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-400 text-left">
                <thead className="text-xs uppercase text-slate-500 font-mono border-b border-slate-900">
                  <tr>
                    <th className="py-3 px-4">Event Date</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-mono text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/20">
                      <td className="py-3 px-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-white font-bold">{log.user ? log.user.email : 'System'}</td>
                      <td className="py-3 px-4 text-cyber-blue font-bold">{log.action}</td>
                      <td className="py-3 px-4 text-slate-400">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 4: FEEDBACK */}
        {activeSubTab === 'feedback' && (
          <div className="space-y-4">
            {feedback.length === 0 ? (
              <div className="glass-panel p-12 text-center text-slate-500 text-sm font-mono border-dashed border-2 border-slate-800">
                No feedback submissions in inbox.
              </div>
            ) : (
              feedback.map((item) => (
                <div key={item.id} className="glass-panel p-6 border border-slate-800 space-y-3 relative">
                  <button 
                    onClick={() => handleDeleteFeedback(item.id)}
                    className="absolute top-6 right-6 text-slate-500 hover:text-red-400 transition cursor-pointer p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-cyber-blue/10 border border-cyber-blue/20 flex items-center justify-center text-cyber-blue">
                      <Heart className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{item.email} &bull; {new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-900/60">
                    {item.message}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </Sidebar>
  );
}

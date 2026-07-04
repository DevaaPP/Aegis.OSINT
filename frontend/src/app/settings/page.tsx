'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Shield, User, Lock, Download, Trash2, CheckCircle } from 'lucide-react';
import { API_URL, getHeaders } from '../../config/api';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setName(user.name || '');
      } catch {
        // fallback
      }
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          name,
          password: password || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setPassword('');
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        setError(data.message || 'Failed to update profile.');
      }
    } catch {
      setError('Connection to backend failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    // Open a direct link to export endpoint which handles file downloads
    const token = localStorage.getItem('token');
    if (!token) return;
    window.location.href = `${API_URL}/auth/export?token=${token}`;
  };

  const handleDeleteAccount = async () => {
    const doubleCheck = confirm(
      'WARNING: Clicking OK will permanently delete your account, all scan history, metadata findings, and opt-out checklists. This action CANNOT be undone. Proceed?'
    );
    if (!doubleCheck) return;

    try {
      const response = await fetch(`${API_URL}/auth/delete`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const data = await response.json();
      if (data.success) {
        alert('Account deleted successfully. Wiping local session.');
        localStorage.clear();
        window.location.href = '/login';
      } else {
        alert(data.message || 'Deletion failed.');
      }
    } catch {
      alert('Failed to connect to delete endpoint.');
    }
  };

  return (
    <Sidebar>
      <div className="space-y-8">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-white font-mono tracking-wide">SYSTEM SETTINGS</h1>
          <p className="text-sm text-slate-400">Configure profile details, export audit portfolios, or delete credentials</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          
          {/* Profile settings Form */}
          <div className="glass-panel p-8 border border-slate-800">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-6 border-b border-slate-900 pb-2">
              Update Profile details
            </h3>

            <form onSubmit={handleUpdate} className="space-y-5">
              
              {success && (
                <div className="bg-cyber-teal/10 border border-cyber-teal/30 text-cyber-teal p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Profile credentials updated successfully.
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-blue" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">New Password (Leave blank to keep current)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-blue" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-cyber-blue text-cyber-dark font-extrabold rounded-lg hover:bg-cyber-teal transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? 'Saving Changes...' : 'Update Settings'}
              </button>
            </form>
          </div>

          {/* Privacy controls (GDPR Portability / Right to be Forgotten) */}
          <div className="space-y-8">
            
            {/* Export data */}
            <div className="glass-panel p-6 border border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-3 border-b border-slate-900 pb-2 flex items-center gap-2">
                <Download className="w-4 h-4 text-cyber-teal" /> GDPR Right to Portability
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Download a structured, complete dump of your account profile, scan histories, findings logs, and cleaning todo checklists as a single JSON file.
              </p>
              <button
                onClick={handleExportData}
                className="w-full py-3 border border-cyber-blue/40 text-cyber-blue hover:bg-cyber-blue/5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Export Data Portability JSON
              </button>
            </div>

            {/* Delete Account */}
            <div className="glass-panel p-6 border border-red-500/20 bg-red-500/5">
              <h3 className="text-sm font-bold text-red-400 font-mono uppercase tracking-wider mb-3 border-b border-red-500/10 pb-2 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" /> GDPR Right to be Forgotten
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Delete your credentials completely. This removes your email, hashed keys, search queries, metadata reports, and checklists. Database cascades will clean all logs instantly.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete Account & Clear History
              </button>
            </div>

          </div>

        </div>

      </div>
    </Sidebar>
  );
}

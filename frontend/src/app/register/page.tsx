'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../../config/api';

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Pass search term forward if present
        if (initialSearch) {
          window.location.href = `/dashboard?search=${encodeURIComponent(initialSearch)}`;
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(data.message || 'Registration failed. Please check inputs.');
      }
    } catch {
      setError('Connection to backend failed. Please ensure the database and backend server are running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3 cursor-pointer" onClick={() => window.location.href = '/'}>
          <Shield className="w-8 h-8 text-cyber-blue" />
          <span className="text-2xl font-bold font-mono tracking-wider">AEGIS.OSINT</span>
        </div>
        <p className="text-slate-400 text-sm">Register a core account to begin scanning footprints</p>
      </div>

      {/* Card */}
      <div className="glass-panel p-8 border border-cyber-blue/20 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm font-semibold">
              {error}
            </div>
          )}

          {initialSearch && (
            <div className="bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue p-3 rounded-lg text-xs font-mono">
              Pending scan target detected: <strong className="underline">{initialSearch}</strong>
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
                placeholder="John Doe"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-cyber-blue text-white" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@email.com"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-cyber-blue text-white" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-10 pr-10 py-3 focus:outline-none focus:border-cyber-blue text-white" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-cyber-blue text-cyber-dark font-extrabold rounded-lg hover:bg-cyber-teal transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyber-blue/10 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Create Account'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm border-t border-slate-850 pt-4">
          <span className="text-slate-400">Already registered? </span>
          <a href="/login" className="text-cyber-blue hover:text-cyber-teal font-bold transition">Sign In</a>
        </div>
      </div>

    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen bg-cyber-dark text-slate-200 items-center justify-center relative overflow-hidden px-6">
      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyber-blue/10 rounded-full blur-[100px] pointer-events-none"></div>

      <Suspense fallback={<div className="text-cyber-blue font-mono">Loading form parameters...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}

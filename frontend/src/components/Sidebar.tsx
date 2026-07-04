'use client';

import React, { useEffect, useState } from 'react';
import { Shield, LayoutDashboard, Search, Trash2, Settings, ShieldAlert, LogOut, User } from 'lucide-react';

interface SidebarProps {
  children: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [activePath, setActivePath] = useState('');

  useEffect(() => {
    setActivePath(window.location.pathname);
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!token || !userStr) {
      window.location.href = '/login';
      return;
    }

    try {
      setCurrentUser(JSON.parse(userStr));
    } catch {
      localStorage.clear();
      window.location.href = '/login';
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen bg-cyber-dark items-center justify-center text-cyber-blue font-mono">
        Verifying security clearance...
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'OSINT Scanner', path: '/scanner', icon: Search },
    { name: 'Cleaning Hub', path: '/cleaning', icon: Trash2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Insert Admin console if user has role ADMIN
  if (currentUser.role === 'ADMIN') {
    navItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldAlert });
  }

  return (
    <div className="flex h-screen bg-cyber-dark text-slate-200 overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-cyber-border/40 bg-cyber-dark/80 backdrop-blur-md flex flex-col justify-between p-6">
        <div className="space-y-8">
          
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <Shield className="w-6 h-6 text-cyber-blue" />
            <span className="font-bold font-mono tracking-wider text-white">AEGIS<span className="text-cyber-blue">.</span>OSINT</span>
          </div>

          {/* Nav links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                    isActive 
                      ? 'bg-cyber-blue/10 border-l-2 border-cyber-blue text-cyber-blue' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="space-y-4 border-t border-slate-900 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-cyber-blue/10 border border-cyber-blue/30 flex items-center justify-center text-cyber-blue">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{currentUser.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-400/80 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* PAGE CONTAINER */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(0,229,255,0.03),transparent_100%)]">
        <div className="p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

    </div>
  );
}

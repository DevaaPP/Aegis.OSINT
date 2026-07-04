'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { FileText, CheckSquare, Square, Trash2, Plus, Copy, CheckCircle, ExternalLink, HelpCircle } from 'lucide-react';
import { API_URL, getHeaders } from '../../config/api';

interface Task {
  id: string;
  title: string;
  category: string;
  details: string | null;
  optOutUrl: string | null;
  isCompleted: boolean;
  sentDate: string | null;
}

interface Broker {
  name: string;
  jurisdiction: string;
  optOutUrl: string;
  category: string;
}

export default function CleaningHubPage() {
  const [activeSubTab, setActiveSubTab] = useState<'checklist' | 'letter' | 'brokers'>('checklist');

  // Request Letter Generator States
  const [jurisdiction, setJurisdiction] = useState<'GDPR' | 'CCPA' | 'DPDP'>('DPDP');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [copied, setCopied] = useState(false);

  // Todo Checklist States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Account Deletion');
  
  // Data Brokers Directory
  const [brokers, setBrokers] = useState<Broker[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchBrokers();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/clean/tasks`, {
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    }
  };

  const fetchBrokers = async () => {
    try {
      const response = await fetch(`${API_URL}/clean/brokers`, {
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setBrokers(data.brokers);
      }
    } catch (err) {
      console.error('Fetch brokers error:', err);
    }
  };

  const handleGenerateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    setCopied(false);

    try {
      const response = await fetch(`${API_URL}/clean/letter`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          jurisdiction,
          userName,
          userEmail,
          userPhone: userPhone || undefined,
          targetCompany
        })
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedLetter(data.letter);
      }
    } catch (err) {
      console.error('Letter generation error:', err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    try {
      const response = await fetch(`${API_URL}/clean/tasks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: newTaskTitle,
          category: newTaskCategory
        })
      });

      const data = await response.json();
      if (data.success) {
        setTasks(prev => [data.task, ...prev]);
        setNewTaskTitle('');
      }
    } catch (err) {
      console.error('Create task error:', err);
    }
  };

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    try {
      const response = await fetch(`${API_URL}/clean/tasks/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ isCompleted: !isCompleted })
      });

      const data = await response.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !isCompleted } : t));
      }
    } catch (err) {
      console.error('Toggle task error:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/clean/tasks/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  return (
    <Sidebar>
      <div className="space-y-8">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-white font-mono tracking-wide">SHIELD MITIGATION</h1>
          <p className="text-sm text-slate-400">Generate legal erasure requests, track cleanup tasks, and opt-out of directories</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-900 gap-6">
          <button 
            onClick={() => setActiveSubTab('checklist')}
            className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeSubTab === 'checklist' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
          >
            ACTIVE CLEANUP CHECKLIST ({tasks.filter(t => !t.isCompleted).length})
          </button>
          <button 
            onClick={() => setActiveSubTab('letter')}
            className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeSubTab === 'letter' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
          >
            LEGAL REQUEST WRITER
          </button>
          <button 
            onClick={() => setActiveSubTab('brokers')}
            className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeSubTab === 'brokers' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
          >
            DATA BROKER REGISTRY
          </button>
        </div>

        {/* SUBTAB 1: CHECKLIST */}
        {activeSubTab === 'checklist' && (
          <div className="grid md:grid-cols-3 gap-8 items-start">
            
            {/* Checklist lists (Col Span 2) */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-2 border-b border-slate-900 pb-2">
                Task tracker
              </h3>

              {tasks.length === 0 ? (
                <div className="glass-panel p-12 text-center text-slate-500 text-sm font-mono border-dashed border-2 border-slate-800">
                  No active cleaning tasks assigned. Use the OSINT scanner to detect exposures.
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`glass-panel p-4 flex items-center justify-between border transition duration-200 ${
                        task.isCompleted ? 'border-slate-900 opacity-60 bg-slate-950/20' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <button 
                          onClick={() => handleToggleTask(task.id, task.isCompleted)}
                          className="text-cyber-blue hover:text-cyber-teal cursor-pointer"
                        >
                          {task.isCompleted ? (
                            <CheckSquare className="w-5 h-5 text-cyber-teal" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <div className="truncate flex-1">
                          <p className={`text-sm font-bold text-white truncate ${task.isCompleted ? 'line-through text-slate-500' : ''}`}>
                            {task.title}
                          </p>
                          <div className="flex gap-2 items-center mt-1">
                            <span className="text-[9px] font-semibold font-mono px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400">
                              {task.category}
                            </span>
                            {task.optOutUrl && (
                              <a 
                                href={task.optOutUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[9px] font-mono text-cyber-blue hover:underline flex items-center gap-0.5"
                              >
                                Opt-Out URL <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-500 hover:text-red-400 transition cursor-pointer p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Task Generator Panel */}
            <div className="glass-panel p-6 border border-cyber-blue/10">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4 border-b border-slate-900 pb-2">
                Add Custom Task
              </h3>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Task Title</label>
                  <input 
                    type="text" 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                    placeholder="e.g. Delete old Steam account"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Category</label>
                  <select 
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue"
                  >
                    <option value="Account Deletion">Account Deletion</option>
                    <option value="Data Broker">Data Broker Removal</option>
                    <option value="Password Reset">Credential Reset</option>
                    <option value="Social Privacy">Privacy Settings</option>
                  </select>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-cyber-blue text-cyber-dark font-extrabold text-xs rounded-lg hover:bg-cyber-teal transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Append Task
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SUBTAB 2: LEGAL REQUEST GENERATOR */}
        {activeSubTab === 'letter' && (
          <div className="grid md:grid-cols-2 gap-8 items-start">
            
            {/* Input fields form */}
            <div className="glass-panel p-8 border border-cyber-blue/15 shadow-2xl">
              <form onSubmit={handleGenerateLetter} className="space-y-5">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider mb-2">Identify Jurisdiction & Assets</h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Applicable Regulation</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setJurisdiction('DPDP')}
                      className={`flex-1 py-2.5 text-xs font-bold font-mono border rounded-lg transition ${jurisdiction === 'DPDP' ? 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue' : 'border-slate-800 text-slate-400 hover:bg-slate-900/30'}`}
                    >
                      India DPDP Act
                    </button>
                    <button 
                      type="button"
                      onClick={() => setJurisdiction('GDPR')}
                      className={`flex-1 py-2.5 text-xs font-bold font-mono border rounded-lg transition ${jurisdiction === 'GDPR' ? 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue' : 'border-slate-800 text-slate-400 hover:bg-slate-900/30'}`}
                    >
                      Europe GDPR
                    </button>
                    <button 
                      type="button"
                      onClick={() => setJurisdiction('CCPA')}
                      className={`flex-1 py-2.5 text-xs font-bold font-mono border rounded-lg transition ${jurisdiction === 'CCPA' ? 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue' : 'border-slate-800 text-slate-400 hover:bg-slate-900/30'}`}
                    >
                      USA CCPA
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-blue" 
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      required
                      placeholder="name@email.com"
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-blue" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Phone Number (Optional)</label>
                    <input 
                      type="text" 
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-blue" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Target Company / Data Broker</label>
                  <input 
                    type="text" 
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    required
                    placeholder="e.g. Truecaller Grievance Officer, Spokeo Inc."
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyber-blue" 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3 bg-cyber-blue text-cyber-dark font-extrabold rounded-lg hover:bg-cyber-teal transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <FileText className="w-4 h-4" /> Generate Deletion Request
                </button>
              </form>
            </div>

            {/* Compiled Output Letter */}
            <div className="glass-panel p-6 border border-slate-850 flex flex-col h-[460px] justify-between">
              <div className="flex justify-between items-center mb-4 border-b border-slate-900 pb-2">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Generated Letter Draft
                </h3>
                {generatedLetter && (
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1 bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue text-xs font-bold rounded hover:bg-cyber-blue hover:text-cyber-dark transition cursor-pointer"
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-cyber-teal" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Draft'}</span>
                  </button>
                )}
              </div>

              {generatedLetter ? (
                <textarea
                  readOnly
                  value={generatedLetter}
                  className="flex-1 w-full bg-slate-950/70 border border-slate-900 rounded-lg p-4 font-mono text-xs leading-relaxed text-slate-300 focus:outline-none resize-none"
                ></textarea>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-mono border border-slate-900 border-dashed rounded-lg p-12 text-center">
                  Fill in the configuration details and click Generate to produce legal erasure notices.
                </div>
              )}
            </div>

          </div>
        )}

        {/* SUBTAB 3: DATA BROKER DIRECTORY */}
        {activeSubTab === 'brokers' && (
          <div className="grid md:grid-cols-2 gap-8">
            {brokers.map((broker, idx) => (
              <div key={idx} className="glass-panel p-6 border border-slate-800 hover:border-cyber-blue/20 transition duration-300 flex flex-col justify-between h-56">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white font-mono">{broker.name}</h3>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-cyber-blue">
                      {broker.jurisdiction}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-1">Category: {broker.category}</p>
                  
                  <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                    {broker.name === 'Truecaller' 
                      ? 'Submit your mobile number with country code (+91) to unlist caller identity data from their public global query directory.'
                      : `Access the suppression dashboard on Spokeo to remove phone, age, relative details and housing history indexing.`}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-900/60">
                  <a 
                    href={broker.optOutUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs font-bold text-cyber-blue hover:text-cyber-teal flex items-center gap-1 transition"
                  >
                    Direct Opt-Out Portal <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      const exists = tasks.some(t => t.title.includes(broker.name));
                      if (exists) {
                        alert(`Task for ${broker.name} is already present in your Cleanup Checklist!`);
                        return;
                      }
                      fetch(`${API_URL}/clean/tasks`, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify({
                          title: `Submit Right to Erasure request to ${broker.name} directory`,
                          category: 'Data Broker',
                          optOutUrl: broker.optOutUrl
                        })
                      }).then(() => fetchTasks());
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    + Add to Checklist
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </Sidebar>
  );
}

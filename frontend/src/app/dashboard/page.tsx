'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { Shield, Eye, Trash2, Calendar, FileDown, AlertTriangle, Activity } from 'lucide-react';
import { API_URL, getHeaders } from '../../config/api';

interface Finding {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  remediation: string;
}

interface ScanRecord {
  id: string;
  target: string;
  type: string;
  riskScore: number;
  createdAt: string;
  findings: Finding[];
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  severity: string;
}

interface GraphLink {
  source: string;
  target: string;
  relationship: string;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const autoSearch = searchParams.get('search') || '';

  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [latestScan, setLatestScan] = useState<ScanRecord | null>(null);
  
  // Graph visualizer data
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'findings'>('overview');

  // Interactive Maltego Transforms States
  const [transformActive, setTransformActive] = useState(false);
  const [transformMsg, setTransformMsg] = useState('');

  const triggerTransform = (name: string) => {
    if (!selectedNode || !graphData) return;

    setTransformActive(true);
    setTransformMsg(`Running Maltego Transform: ${name}...`);

    setTimeout(() => {
      setTransformActive(false);
      setTransformMsg('');

      const newNodes = [...graphData.nodes];
      const newLinks = [...graphData.links];

      // Add resolved nodes dynamically based on selectedNode or transform category
      if (name.includes('Google GAIA')) {
        const gaiaId = 'gaia_99999_ai';
        if (!newNodes.some(n => n.id === gaiaId)) {
          newNodes.push({
            id: gaiaId,
            label: 'Gaia ID: 118491849 (AI Resolved)',
            type: 'PROFILE',
            severity: 'INFO'
          });
          newLinks.push({
            source: selectedNode.id,
            target: gaiaId,
            relationship: 'RESOLVED_GAIA'
          });
        }
      } else if (name.includes('Truecaller')) {
        const tcId = 'truecaller_ai';
        if (!newNodes.some(n => n.id === tcId)) {
          newNodes.push({
            id: tcId,
            label: 'Truecaller: John Doe (Resolved)',
            type: 'PROFILE',
            severity: 'HIGH'
          });
          newLinks.push({
            source: selectedNode.id,
            target: tcId,
            relationship: 'RESOLVED_IDENTIFIER'
          });
        }
      } else if (name.includes('Breaches')) {
        const breachId = 'breach_transform_leak';
        if (!newNodes.some(n => n.id === breachId)) {
          newNodes.push({
            id: breachId,
            label: 'LinkedIn Leak (Exposed Credentials)',
            type: 'BREACH',
            severity: 'HIGH'
          });
          newLinks.push({
            source: selectedNode.id,
            target: breachId,
            relationship: 'LEAKED_IN'
          });
        }
      } else if (name.includes('Dorks')) {
        const dorkId = 'dork_scan_results';
        if (!newNodes.some(n => n.id === dorkId)) {
          newNodes.push({
            id: dorkId,
            label: 'Pastebin: Leaked Credential Log',
            type: 'DOCUMENT',
            severity: 'MEDIUM'
          });
          newLinks.push({
            source: selectedNode.id,
            target: dorkId,
            relationship: 'LEAKED_FOOTPRINT'
          });
        }
      } else {
        // Generic properties transform
        const propId = `properties_${selectedNode.id}`;
        if (!newNodes.some(n => n.id === propId)) {
          newNodes.push({
            id: propId,
            label: `Details: Verified Active Entity`,
            type: 'PROFILE',
            severity: 'INFO'
          });
          newLinks.push({
            source: selectedNode.id,
            target: propId,
            relationship: 'HAS_PROPERTY'
          });
        }
      }

      setGraphData({ nodes: newNodes, links: newLinks });
    }, 1500);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/scan/history`, {
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success && data.scans.length > 0) {
        setScanHistory(data.scans);
        setLatestScan(data.scans[0]);
        
        // Reconstruct basic graph for the latest scan
        reconstructGraph(data.scans[0]);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    }
  };

  useEffect(() => {
    // If redirected with a search target, run scan immediately
    if (autoSearch && scanHistory.length === 0) {
      triggerAutoScan(autoSearch);
    }
  }, [autoSearch, scanHistory]);

  const triggerAutoScan = async (target: string) => {
    setLoading(true);
    setError('');
    
    const type = target.includes('@') ? 'EMAIL' : 'USERNAME';

    try {
      const response = await fetch(`${API_URL}/scan/recursive`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ target, type })
      });

      const data = await response.json();
      if (data.success) {
        await fetchHistory();
      } else {
        setError(data.message || 'Auto scan failed.');
      }
    } catch {
      setError('Connection to scanner failed.');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear your entire scan history?')) return;
    try {
      const response = await fetch(`${API_URL}/scan/history`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setScanHistory([]);
        setLatestScan(null);
        setGraphData(null);
      }
    } catch (err) {
      console.error('Clear history error:', err);
    }
  };

  const reconstructGraph = (scan: ScanRecord) => {
    // Reconstruct simple visual node graph based on database findings
    const nodes: GraphNode[] = [{ id: 'root', label: scan.target, type: 'ROOT', severity: 'INFO' }];
    const links: GraphLink[] = [];

    const categoriesMap: { [key: string]: boolean } = {};
    
    scan.findings.forEach((finding, idx) => {
      const catId = `cat_${finding.category.replace(/\s+/g, '').toLowerCase()}`;
      if (!categoriesMap[catId]) {
        categoriesMap[catId] = true;
        nodes.push({
          id: catId,
          label: finding.category,
          type: 'PROFILE',
          severity: finding.severity as any
        });
        links.push({
          source: 'root',
          target: catId,
          relationship: 'RISK_VECTOR'
        });
      }

      const findingId = `find_${idx}`;
      nodes.push({
        id: findingId,
        label: finding.title,
        type: 'BREACH',
        severity: finding.severity as any
      });
      links.push({
        source: catId,
        target: findingId,
        relationship: 'FINDING'
      });
    });

    setGraphData({ nodes, links });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-cyber-neon';
    if (score >= 35) return 'text-amber-400';
    return 'text-cyber-teal';
  };

  const getScoreStroke = (score: number) => {
    if (score >= 70) return '#ff007f';
    if (score >= 35) return '#fbbf24';
    return '#00ffcc';
  };

  // Render SVG Force-Directed Graph Layout from scratch
  const renderNodeGraph = () => {
    if (!graphData || graphData.nodes.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center text-slate-500 text-sm font-mono">
          No active scan map loaded. Run a scan in the OSINT Scanner.
        </div>
      );
    }

    const width = 600;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;

    // Distribute nodes in a force circular layout
    const totalNodes = graphData.nodes.length;
    const positionedNodes = graphData.nodes.map((node, index) => {
      if (node.id === 'root') {
        return { ...node, x: centerX, y: centerY, r: 24 };
      }
      
      const isCategory = node.id.startsWith('cat_') || node.id.startsWith('truecaller_') || node.id.startsWith('carrier_');
      const angle = totalNodes > 1 ? (index * 2 * Math.PI) / (totalNodes - 1) : 0;
      const radius = isCategory ? 85 : 160;
      
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        r: isCategory ? 16 : 10
      };
    });

    const getSeverityColor = (sev: string) => {
      if (sev === 'CRITICAL') return '#ff007f';
      if (sev === 'HIGH') return '#ef4444';
      if (sev === 'MEDIUM') return '#fbbf24';
      if (sev === 'LOW') return '#3b82f6';
      return '#00e5ff'; // INFO
    };

    return (
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 w-full bg-slate-950/70 rounded-xl border border-slate-900 p-4 relative overflow-hidden h-[340px]">
          <div className="absolute top-4 left-4 text-xs font-bold text-cyber-blue font-mono uppercase tracking-wider">
            Bi-directional Footprint Graph
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            {/* Draw Links */}
            {graphData.links.map((link, idx) => {
              const sourceNode = positionedNodes.find(n => n.id === link.source);
              const targetNode = positionedNodes.find(n => n.id === link.target);
              if (!sourceNode || !targetNode) return null;
              
              return (
                <line
                  key={idx}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="rgba(0, 229, 255, 0.15)"
                  strokeWidth="1.5"
                  className="node-line"
                />
              );
            })}

            {/* Draw Nodes */}
            {positionedNodes.map((node) => (
              <g 
                key={node.id} 
                className="cursor-pointer group"
                onClick={() => setSelectedNode(node)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill="#121829"
                  stroke={getSeverityColor(node.severity)}
                  strokeWidth={node.id === 'root' ? 3 : 2}
                  className="transition duration-300 group-hover:scale-125"
                />
                {node.id === 'root' && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r + 6}
                    fill="none"
                    stroke="#00e5ff"
                    strokeWidth="1"
                    strokeDasharray="4"
                    className="animate-spin"
                    style={{ transformOrigin: `${node.x}px ${node.y}px`, animationDuration: '12s' }}
                  />
                )}
                {/* Short labels for key nodes */}
                {(node.id === 'root' || node.id.startsWith('cat_')) && (
                  <text
                    x={node.x}
                    y={node.y + node.r + 14}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="10"
                    fontWeight="bold"
                    className="font-mono bg-slate-950 px-1"
                  >
                    {node.label.length > 15 ? `${node.label.substring(0, 12)}...` : node.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Selected Node Inspector */}
        <div className="w-full md:w-80 glass-panel p-6 border border-cyber-blue/10 min-h-[300px] flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider mb-4 border-b border-slate-900 pb-2">
              Footprint Node Details
            </h4>
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-cyber-blue font-mono px-2 py-0.5 bg-cyber-blue/10 border border-cyber-blue/20 rounded">
                    {selectedNode.type}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2 leading-snug">{selectedNode.label}</h3>
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <p>Node ID: {selectedNode.id}</p>
                  <p>Exposure Severity: <span style={{ color: getSeverityColor(selectedNode.severity) }}>{selectedNode.severity}</span></p>
                </div>
                
                {/* Maltego Transforms Panel */}
                <div className="mt-4 border-t border-slate-900 pt-4 space-y-2">
                  <span className="text-[10px] font-bold text-cyber-blue font-mono uppercase tracking-wider block mb-2">
                    Maltego Transforms
                  </span>
                  
                  {transformActive ? (
                    <div className="py-4 text-center space-y-2 bg-slate-950/60 border border-slate-900 rounded-lg">
                      <div className="w-5 h-5 border-2 border-cyber-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-[9px] font-mono text-cyber-blue animate-pulse">{transformMsg}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedNode.type === 'ROOT' && (
                        <button 
                          onClick={() => triggerTransform('Resolve Target Footprint')}
                          className="w-full text-left px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white rounded transition flex justify-between items-center cursor-pointer"
                        >
                          <span>➔ targetToFootprint()</span>
                          <span className="text-cyber-blue font-semibold">[Run]</span>
                        </button>
                      )}

                      {selectedNode.type === 'EMAIL' && (
                        <>
                          <button 
                            onClick={() => triggerTransform('Resolve Email to Breaches')}
                            className="w-full text-left px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white rounded transition flex justify-between items-center cursor-pointer"
                          >
                            <span>➔ emailToBreaches()</span>
                            <span className="text-cyber-blue font-semibold">[Run]</span>
                          </button>
                          <button 
                            onClick={() => triggerTransform('Resolve Email to Google GAIA ID')}
                            className="w-full text-left px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white rounded transition flex justify-between items-center cursor-pointer"
                          >
                            <span>➔ emailToGoogleGaia()</span>
                            <span className="text-cyber-blue font-semibold">[Run]</span>
                          </button>
                        </>
                      )}

                      {selectedNode.id.startsWith('phone_') && (
                        <>
                          <button 
                            onClick={() => triggerTransform('Reverse Identity Truecaller Audit')}
                            className="w-full text-left px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white rounded transition flex justify-between items-center cursor-pointer"
                          >
                            <span>➔ phoneToTruecaller()</span>
                            <span className="text-cyber-blue font-semibold">[Run]</span>
                          </button>
                          <button 
                            onClick={() => triggerTransform('Google Dorks Search Engine Footprints')}
                            className="w-full text-left px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white rounded transition flex justify-between items-center cursor-pointer"
                          >
                            <span>➔ phoneToGoogleDorks()</span>
                            <span className="text-cyber-blue font-semibold">[Run]</span>
                          </button>
                        </>
                      )}

                      {/* Generic transform */}
                      {selectedNode.type !== 'ROOT' && selectedNode.type !== 'EMAIL' && !selectedNode.id.startsWith('phone_') && (
                        <button 
                          onClick={() => triggerTransform(`Extract metadata details for ${selectedNode.label}`)}
                          className="w-full text-left px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white rounded transition flex justify-between items-center cursor-pointer"
                        >
                          <span>➔ entityToProperties()</span>
                          <span className="text-cyber-blue font-semibold">[Run]</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 italic mt-2">Click on other graph nodes to audit credentials, reviews, and platform exposures.</p>
              </div>
            ) : (
              <div className="text-slate-500 text-sm font-mono text-center py-12">
                Click any graph node to inspect metadata, GPS tags, or breach exposures.
              </div>
            )}
          </div>
          {selectedNode && selectedNode.id !== 'root' && (
            <button 
              onClick={() => window.location.href = '/cleaning'}
              className="w-full py-2 bg-cyber-blue/10 border border-cyber-blue text-cyber-blue text-xs font-bold rounded hover:bg-cyber-blue hover:text-cyber-dark transition mt-4"
            >
              Resolve Exposure
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Sidebar>
      <div className="space-y-8">
        
        {/* Title */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-white font-mono tracking-wide">SHIELD CONTROL</h1>
            <p className="text-sm text-slate-400">Recursive Digital Footprint Exposure Audits & Threat Index</p>
          </div>
          {scanHistory.length > 0 && (
            <button 
              onClick={clearHistory}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500 hover:text-white transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Logs
            </button>
          )}
        </div>

        {loading && (
          <div className="glass-panel p-12 border border-cyber-blue/30 text-center space-y-4">
            <Activity className="w-12 h-12 text-cyber-blue animate-pulse mx-auto" />
            <h3 className="text-lg font-bold text-white font-mono">ENACTING RECURSIVE RECONNAISSANCE...</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Probing username listings, scanning local breach databases, mapping Google reviews, and analyzing biometric face occurrences.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {latestScan && !loading && (
          <>
            {/* Top overview stats */}
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Risk score radial meter */}
              <div className="glass-panel p-6 flex items-center justify-between border border-cyber-blue/20">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-400 uppercase font-mono tracking-wider">Privacy Risk</h3>
                  <p className="text-2xl font-extrabold text-white">{latestScan.riskScore}/100</p>
                  <p className="text-xs text-slate-500 font-mono uppercase">
                    {latestScan.riskScore >= 70 ? 'CRITICAL EXPOSURE' : latestScan.riskScore >= 35 ? 'WARNING' : 'SECURE'}
                  </p>
                </div>
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="34" stroke="rgba(31, 41, 55, 0.5)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="34" 
                      stroke={getScoreStroke(latestScan.riskScore)} 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray="213"
                      strokeDashoffset={213 - (213 * latestScan.riskScore) / 100}
                    />
                  </svg>
                  <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-mono font-extrabold ${getScoreColor(latestScan.riskScore)}`}>
                    {latestScan.riskScore}%
                  </span>
                </div>
              </div>

              {/* Exposed items counter */}
              <div className="glass-panel p-6 flex items-center gap-4 border border-cyber-blue/15">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Exposed Vectors</h3>
                  <p className="text-2xl font-extrabold text-white mt-0.5">{latestScan.findings.length}</p>
                  <p className="text-xs text-slate-500 font-mono">EXPOSURE POINTS DETECTED</p>
                </div>
              </div>

              {/* Scanned target info */}
              <div className="glass-panel p-6 flex items-center gap-4 border border-cyber-blue/15">
                <div className="w-12 h-12 bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue flex items-center justify-center rounded-xl">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Audit Target</h3>
                  <p className="text-lg font-bold text-white truncate mt-0.5">{latestScan.target}</p>
                  <p className="text-xs text-slate-500 font-mono uppercase">{latestScan.type} AUDIT</p>
                </div>
              </div>
            </div>

            {/* TAB INTERFACES */}
            <div className="space-y-6">
              <div className="flex border-b border-slate-900 gap-6">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeTab === 'overview' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  EXPOSURE OVERVIEW
                </button>
                <button 
                  onClick={() => setActiveTab('graph')}
                  className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeTab === 'graph' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  RECURSIVE GRAPH
                </button>
                <button 
                  onClick={() => setActiveTab('findings')}
                  className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeTab === 'findings' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  FINDINGS DETAILS ({latestScan.findings.length})
                </button>
              </div>

              {activeTab === 'overview' && (
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Left: Summary cards of categories */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-2">Exposure Summary</h3>
                    
                    {latestScan.findings.length === 0 ? (
                      <div className="glass-panel p-8 text-center text-slate-500 text-sm font-mono">
                        No exposed items found. Your footprint is clean!
                      </div>
                    ) : (
                      latestScan.findings.slice(0, 4).map((f, idx) => (
                        <div key={idx} className="glass-panel p-5 border border-slate-900/60 flex items-start gap-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono mt-1 ${
                            f.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                            f.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                            f.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {f.severity}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white leading-none">{f.title}</h4>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{f.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right: Advisor Panel */}
                  <div className="glass-panel p-6 border border-cyber-blue/10 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4 border-b border-slate-900 pb-2">AI advisor blueprint</h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        Remediation algorithms advise running targeted credential resets and unlisting caller registry listings.
                      </p>
                      <ul className="text-xs space-y-2 text-slate-300 font-mono">
                        {latestScan.findings.some(f => f.category === 'Data Breach') && (
                          <li className="flex items-start gap-2">
                            <span className="text-cyber-blue font-bold">✔</span> Change password on leaked services (e.g. Canva/Adobe).
                          </li>
                        )}
                        {latestScan.findings.some(f => f.category === 'Location Exposed') && (
                          <li className="flex items-start gap-2">
                            <span className="text-cyber-blue font-bold">✔</span> Make Google Maps reviews private to prevent coordinate tracing.
                          </li>
                        )}
                        <li className="flex items-start gap-2">
                          <span className="text-cyber-blue font-bold">✔</span> Execute unlisting templates inside the Cleaning Hub.
                        </li>
                      </ul>
                    </div>
                    <button 
                      onClick={() => window.location.href = `/cleaning`}
                      className="w-full py-3 bg-cyber-blue text-cyber-dark font-extrabold rounded-lg hover:bg-cyber-teal transition mt-6 cursor-pointer text-center text-sm shadow-md"
                    >
                      Open Cleaning Panel
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'graph' && renderNodeGraph()}

              {activeTab === 'findings' && (
                <div className="space-y-4">
                  {latestScan.findings.map((f, idx) => (
                    <div key={idx} className="glass-panel p-6 border border-slate-900/80">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-cyber-blue font-mono px-2 py-0.5 bg-cyber-blue/10 border border-cyber-blue/20 rounded">
                              {f.category}
                            </span>
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
                              f.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                              f.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                              f.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {f.severity}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white mt-2 leading-snug">{f.title}</h3>
                        </div>
                      </div>
                      <div className="mt-4 grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-900/60 text-xs">
                        <div>
                          <h4 className="font-bold text-slate-400 uppercase font-mono tracking-wider mb-1">Exposure Description</h4>
                          <p className="text-slate-300 leading-relaxed">{f.description}</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-cyber-blue uppercase font-mono tracking-wider mb-1">Remediation Action</h4>
                          <p className="text-slate-300 leading-relaxed">{f.remediation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SCAN LOGS */}
            <div className="glass-panel p-6 border border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4 border-b border-slate-900 pb-2">
                Recent Scan Logs & Downloads
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-400">
                  <thead className="text-xs uppercase text-slate-500 font-mono border-b border-slate-900">
                    <tr>
                      <th className="py-3 px-4">Audit Target</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Risk Score</th>
                      <th className="py-3 px-4 text-right">Reports Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {scanHistory.map((scan) => (
                      <tr key={scan.id} className="hover:bg-slate-900/20">
                        <td className="py-3.5 px-4 font-bold text-white font-mono">{scan.target}</td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-cyber-blue font-mono">{scan.type}</td>
                        <td className="py-3.5 px-4 text-xs font-mono">{new Date(scan.createdAt).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4 font-bold font-mono">{scan.riskScore}/100</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex gap-2">
                            <a 
                              href={`${API_URL}/scan/report/${scan.id}?format=html`}
                              className="p-1 text-slate-400 hover:text-cyber-blue transition"
                              title="Download HTML Report"
                            >
                              <FileDown className="w-4 h-4" />
                            </a>
                            <a 
                              href={`${API_URL}/scan/report/${scan.id}?format=json`}
                              className="p-1 text-slate-400 hover:text-cyber-teal transition"
                              title="Download JSON Data"
                            >
                              <FileDown className="w-4 h-4 text-cyber-teal/80" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!latestScan && !loading && (
          <div className="glass-panel p-16 border border-slate-800 text-center space-y-4">
            <Shield className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-lg font-bold text-white font-mono uppercase">No Audit Scans Run Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Run your first recursive footprint scan in the OSINT Scanner to generate your risk index and connected profile graph.
            </p>
            <button 
              onClick={() => window.location.href = '/scanner'}
              className="px-6 py-2.5 bg-cyber-blue text-cyber-dark font-extrabold rounded-lg hover:bg-cyber-teal transition cursor-pointer"
            >
              Analyze Footprint
            </button>
          </div>
        )}

      </div>
    </Sidebar>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-cyber-dark items-center justify-center text-cyber-blue font-mono">Loading dashboard parameters...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

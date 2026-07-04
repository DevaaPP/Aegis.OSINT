'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '../../components/Sidebar';
import { Search, FileText, Upload, RefreshCw, AlertTriangle, CheckCircle, HelpCircle, MapPin } from 'lucide-react';
import { API_URL, getHeaders } from '../../config/api';

// Dynamically import Leaflet Map component with SSR disabled (critical to prevent window undefined reference crashes)
const ExifMap = dynamic(() => import('../../components/ExifMap'), { ssr: false });

export default function ScannerPage() {
  const [activeTab, setActiveTab] = useState<'footprint' | 'metadata'>('footprint');

  // Footprint Prober States
  const [target, setTarget] = useState('');
  const [scanType, setScanType] = useState<'USERNAME' | 'EMAIL'>('USERNAME');
  const [loading, setLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [error, setError] = useState('');

  // Metadata Analyzer States
  const [file, setFile] = useState<File | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState('');
  const [metaFindings, setMetaFindings] = useState<any[]>([]);
  const [rawMetadata, setRawMetadata] = useState<any>(null);
  const [cleanLoading, setCleanLoading] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState(false);
  const [cleanFileName, setCleanFileName] = useState('');
  const [cleanBase64, setCleanBase64] = useState('');

  const handleRecursiveScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;

    setLoading(true);
    setError('');
    setScanStatus('Enacting recursive probers...');

    try {
      // Step 1: Sherlock/Tookie username checks
      setScanStatus('Stage 1: Probing username directory maps...');
      
      const response = await fetch(`${API_URL}/scan/recursive`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ target, type: scanType })
      });

      const data = await response.json();
      if (data.success) {
        setScanStatus('Scan complete! Redirecting to exposure dashboard...');
        window.location.href = '/dashboard';
      } else {
        setError(data.message || 'Footprint scan failed.');
      }
    } catch {
      setError('Connection to scan cluster failed. Verify server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMetaError('');
    setCleanSuccess(false);
    setCleanFileName('');
    setCleanBase64('');
    setMetaFindings([]);
    setRawMetadata(null);

    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      if (['.jpg', '.jpeg', '.pdf', '.docx'].includes(ext)) {
        setFile(selectedFile);
        triggerMetadataAnalyze(selectedFile);
      } else {
        setMetaError('Unsupported file type. Aegis strips JPEGs, PDFs, and DOCX files only.');
        setFile(null);
      }
    }
  };

  const triggerMetadataAnalyze = async (selectedFile: File) => {
    setMetaLoading(true);
    setMetaError('');

    try {
      const base64Str = await convertFileToBase64(selectedFile);

      const response = await fetch(`${API_URL}/scan/metadata/analyze`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileBase64: base64Str
        })
      });

      const data = await response.json();
      if (data.success) {
        setMetaFindings(data.findings);
        setRawMetadata(data.rawMetadata);
      } else {
        setMetaError(data.message || 'File analysis failed.');
      }
    } catch {
      setMetaError('Failed to upload file for metadata audit.');
    } finally {
      setMetaLoading(false);
    }
  };

  const triggerMetadataClean = async () => {
    if (!file) return;
    setCleanLoading(true);
    setMetaError('');
    setCleanSuccess(false);

    try {
      const base64Str = await convertFileToBase64(file);

      const response = await fetch(`${API_URL}/scan/metadata/clean`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          fileName: file.name,
          fileBase64: base64Str
        })
      });

      const data = await response.json();
      if (data.success) {
        setCleanSuccess(true);
        setCleanFileName(data.fileName);
        setCleanBase64(data.fileBase64);
        
        // Trigger automatic browser download
        triggerBrowserDownload(data.fileBase64, data.fileName);
      } else {
        setMetaError(data.message || 'Stripping metadata failed.');
      }
    } catch {
      setMetaError('Failed to sanitize file.');
    } finally {
      setCleanLoading(false);
    }
  };

  const convertFileToBase64 = (fileObj: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileObj);
      reader.onload = () => {
        const resultStr = reader.result as string;
        // Strip data prefix: "data:image/jpeg;base64,"
        const base64 = resultStr.substring(resultStr.indexOf(',') + 1);
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const triggerBrowserDownload = (base64Data: string, fileNameStr: string) => {
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${base64Data}`;
    link.download = fileNameStr;
    link.click();
  };

  return (
    <Sidebar>
      <div className="space-y-8">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-white font-mono tracking-wide">RECONNAISSANCE ARRAY</h1>
          <p className="text-sm text-slate-400">Trigger recursive footprint audits or audit files for hidden leaks</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-900 gap-6">
          <button 
            onClick={() => setActiveTab('footprint')}
            className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeTab === 'footprint' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
          >
            RECURSIVE OSINT SCANNER
          </button>
          <button 
            onClick={() => setActiveTab('metadata')}
            className={`pb-3 text-sm font-bold font-mono tracking-wider transition ${activeTab === 'metadata' ? 'border-b-2 border-cyber-blue text-cyber-blue' : 'text-slate-500 hover:text-slate-300'}`}
          >
            METADATA STRIPPER
          </button>
        </div>

        {/* TAB 1: RECURSIVE SCANNER */}
        {activeTab === 'footprint' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="glass-panel p-8 border border-cyber-blue/15 shadow-2xl flex flex-col justify-between">
              <form onSubmit={handleRecursiveScan} className="space-y-6">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider mb-2">Configure Scan Target</h3>
                
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs font-semibold">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Scan Vector</label>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setScanType('USERNAME')}
                      className={`flex-1 py-2.5 text-xs font-bold font-mono border rounded-lg transition ${scanType === 'USERNAME' ? 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue' : 'border-slate-800 text-slate-400 hover:bg-slate-900/30'}`}
                    >
                      Username Audit
                    </button>
                    <button 
                      type="button"
                      onClick={() => setScanType('EMAIL')}
                      className={`flex-1 py-2.5 text-xs font-bold font-mono border rounded-lg transition ${scanType === 'EMAIL' ? 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue' : 'border-slate-800 text-slate-400 hover:bg-slate-900/30'}`}
                    >
                      Email Address Audit
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono tracking-wider">Input Target</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      required
                      placeholder={scanType === 'USERNAME' ? 'e.g. johndoe_code' : 'name@domain.com'}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-cyber-blue text-white" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 bg-cyber-blue text-cyber-dark font-extrabold rounded-lg hover:bg-cyber-teal transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {loading ? 'Analyzing...' : 'Execute OSINT Probe'}
                </button>
              </form>

              {loading && (
                <div className="mt-6 border-t border-slate-900 pt-4 text-xs font-mono text-cyber-blue animate-pulse">
                  Active Thread Status: {scanStatus}
                </div>
              )}
            </div>

            {/* Scanning details / documentation */}
            <div className="glass-panel p-6 border border-slate-850 space-y-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-2">Footprint Mapping Logic</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aegis coordinates multiple specialized modules recursively to build your graph:
              </p>
              <div className="space-y-3 text-xs">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyber-blue/10 flex items-center justify-center text-cyber-blue font-mono font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-white leading-tight">Username Probing</h4>
                    <p className="text-slate-500 mt-0.5">Scans 20+ active sites (GitHub, Reddit, Medium) using Sherlock response signatures.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyber-teal/10 flex items-center justify-center text-cyber-teal font-mono font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-white leading-tight">Gmail OSINT (GHunt)</h4>
                    <p className="text-slate-500 mt-0.5">Extracts public Google Gaia IDs, Map review coordinates, and YouTube channels.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyber-purple/10 flex items-center justify-center text-cyber-purple font-mono font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-white leading-tight">Credential Stuffing Checks</h4>
                    <p className="text-slate-500 mt-0.5">Cross-references email addresses against our 1,000+ local breach database registers.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: METADATA STRIPPER */}
        {activeTab === 'metadata' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Upload form */}
            <div className="glass-panel p-8 border border-cyber-blue/15 shadow-2xl flex flex-col justify-between">
              <div className="space-y-6">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider mb-2">Upload Files to Audit</h3>
                
                {metaError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs font-semibold">
                    {metaError}
                  </div>
                )}

                {/* Upload drag drop zone */}
                <div className="border-2 border-dashed border-slate-800 hover:border-cyber-blue/40 rounded-xl p-8 text-center bg-slate-900/10 cursor-pointer relative transition duration-300">
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.pdf,.docx"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-white">
                    {file ? file.name : 'Select JPG, PDF, or DOCX file'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Drag and drop file or click to browse (Max 5MB)</p>
                </div>

                {metaLoading && (
                  <div className="text-center py-4 space-y-2">
                    <RefreshCw className="w-6 h-6 text-cyber-blue animate-spin mx-auto" />
                    <p className="text-xs font-mono text-cyber-blue">Analyzing binary headers...</p>
                  </div>
                )}

                {cleanSuccess && (
                  <div className="bg-cyber-teal/10 border border-cyber-teal/30 text-cyber-teal p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> File cleaned! Download of <strong>{cleanFileName}</strong> started.
                  </div>
                )}

                {metaFindings.length > 0 && !metaLoading && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider mb-2 border-b border-slate-900 pb-1">Exposure Warnings</h4>
                    
                    {metaFindings.map((f, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-xs">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                        <div>
                          <p className="font-bold text-white">{f.title}</p>
                          <p className="text-slate-400 mt-1 leading-relaxed">{f.description}</p>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={triggerMetadataClean}
                      disabled={cleanLoading}
                      className="w-full py-3 bg-cyber-blue text-cyber-dark font-extrabold rounded-lg hover:bg-cyber-teal transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 mt-4"
                    >
                      {cleanLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      {cleanLoading ? 'Sanitizing Buffer...' : 'Strip Metadata & Download'}
                    </button>
                  </div>
                )}

                {file && metaFindings.length === 0 && !metaLoading && (
                  <div className="bg-cyber-teal/10 border border-cyber-teal/20 text-cyber-teal p-4 rounded-lg text-xs font-semibold">
                    🎉 Excellent! No tracking metadata found in the document headers.
                  </div>
                )}
              </div>
            </div>

            {/* GPS coordinates Map panel */}
            <div className="glass-panel p-6 border border-slate-850 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4 border-b border-slate-900 pb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyber-blue" /> Photo Geolocation Tracing
                </h3>
                {rawMetadata && rawMetadata.gps ? (
                  <div className="space-y-4">
                    <div className="h-64 bg-slate-950 rounded-xl overflow-hidden border border-slate-900">
                      <ExifMap 
                        latitude={rawMetadata.gps.latitude} 
                        longitude={rawMetadata.gps.longitude} 
                        popupText={`${file?.name || 'Image'} Geolocation`}
                      />
                    </div>
                    <div className="text-xs font-mono space-y-1 bg-slate-900/50 p-4 border border-slate-800 rounded-lg">
                      <p className="text-white font-bold">GPS Coordinate Logs:</p>
                      <p>Latitude: {rawMetadata.gps.latitude}</p>
                      <p>Longitude: {rawMetadata.gps.longitude}</p>
                      {rawMetadata.gps.altitude !== undefined && <p>Altitude: {rawMetadata.gps.altitude} meters</p>}
                      {rawMetadata.dateTime && <p>Date Taken: {rawMetadata.dateTime}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center text-slate-500 text-sm font-mono text-center px-6 py-12 border border-slate-900 border-dashed rounded-xl">
                    Upload a JPEG photo containing coordinates to plot capture location.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </Sidebar>
  );
}

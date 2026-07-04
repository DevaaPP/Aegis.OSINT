'use client';

import React, { useState } from 'react';
import { Shield, Search, Eye, FileText, Trash2, Mail, ArrowRight, Lock, MapPin, CheckCircle, HelpCircle } from 'lucide-react';
import { API_URL } from '../config/api';

export default function LandingPage() {
  // Onboarding Quiz State
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({
    passwordReuse: false,
    photosGeo: false,
    manyAccounts: false,
    checkedBreaches: false,
    truecallerActive: false
  });
  const [quizResult, setQuizResult] = useState<number | null>(null);

  // Feedback Form State
  const [feedback, setFeedback] = useState({ name: '', email: '', message: '' });
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  // Simulated Search input leading to authentication
  const [simSearch, setSimSearch] = useState('');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleQuizAnswer = (key: string, value: boolean) => {
    setQuizAnswers(prev => ({ ...prev, [key]: value }));
    if (quizStep < 4) {
      setQuizStep(prev => prev + 1);
    } else {
      // Calculate estimated footprint score
      let score = 20;
      if (quizAnswers.passwordReuse) score += 20;
      if (quizAnswers.photosGeo) score += 15;
      if (quizAnswers.manyAccounts) score += 15;
      if (!quizAnswers.checkedBreaches) score += 15;
      if (quizAnswers.truecallerActive) score += 15;
      
      // Account for the last step just clicked
      if (key === 'truecallerActive' && value) score += 15;

      setQuizResult(score);
      setQuizStep(5);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess(false);

    try {
      const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
      });

      const data = await response.json();
      if (data.success) {
        setFeedbackSuccess(true);
        setFeedback({ name: '', email: '', message: '' });
      } else {
        setFeedbackError(data.message || 'Failed to submit feedback.');
      }
    } catch {
      setFeedbackError('Server is currently offline. Please run the database container first.');
    }
  };

  const resetQuiz = () => {
    setQuizAnswers({
      passwordReuse: false,
      photosGeo: false,
      manyAccounts: false,
      checkedBreaches: false,
      truecallerActive: false
    });
    setQuizStep(0);
    setQuizResult(null);
  };

  const faqs = [
    {
      q: 'How does Aegis find my digital footprint?',
      a: 'Aegis runs a recursive OSINT mapper. It probes public directory structures for username claims (Sherlock method), cross-references databases of historical leaks, parses document/photo metadata for location coordinates, and simulates Google account indexing (GHunt method).'
    },
    {
      q: 'Does Aegis scrape private databases or bypass logins?',
      a: 'No. Aegis operates strictly under ethical cybersecurity guidelines. It only accesses information that is publicly indexed, exposed in public data leaks, or explicitly uploaded by you (like photos/resumes for metadata audits).'
    },
    {
      q: 'What is the India DPDP Act 2023 feature?',
      a: 'The Digital Personal Data Protection Act, 2023, is India\'s data privacy law. Section 12 gives you the legal "Right to Erasure." Aegis auto-generates legally-binding letters addressed to Indian companies and their Grievance Officers to compel them to delete your phone number or data.'
    },
    {
      q: 'How does the Metadata Stripper protect me?',
      a: 'When you take a photo on a smartphone, it embeds GPS, camera serials, and date tags. When you upload a resume, it leaks your operating system path and name. Aegis strips this binary data in-memory, letting you download a sanitized copy.'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-cyber-dark text-slate-200">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 border-b border-cyber-border/40 bg-cyber-dark/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyber-blue" />
            <span className="text-xl font-bold tracking-wider text-slate-100 font-mono">
              AEGIS<span className="text-cyber-blue">.</span>OSINT
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide">
            <a href="#features" className="hover:text-cyber-blue transition">Features</a>
            <a href="#quiz" className="hover:text-cyber-blue transition">Exposure Quiz</a>
            <a href="#pricing" className="hover:text-cyber-blue transition">Pricing</a>
            <a href="#faq" className="hover:text-cyber-blue transition">FAQ</a>
            <a href="#contact" className="hover:text-cyber-blue transition">Contact</a>
          </nav>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-semibold hover:text-cyber-blue transition">Sign In</a>
            <a href="/register" className="px-4 py-2 text-sm font-bold bg-cyber-blue/10 border border-cyber-blue text-cyber-blue rounded-md hover:bg-cyber-blue hover:text-cyber-dark transition duration-300">
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden py-24 md:py-32 border-b border-cyber-border/20">
        {/* Decorative Grid overlays */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyber-blue/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold border border-cyber-blue/30 bg-cyber-blue/5 rounded-full text-cyber-blue mb-6 tracking-wide uppercase">
            <Shield className="w-3.5 h-3.5" /> Self-Contained Footprint Auditing
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            Discover Your Public <br/>
            <span className="bg-gradient-to-r from-cyber-blue via-cyber-teal to-cyber-purple bg-clip-text text-transparent">
              Digital Footprint & Leak Exposure
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Run recursive audits across 30+ services, check database leaks, extract hidden document metadata, and unlist your identity using CCPA/GDPR/India DPDP Act 2023 legal erasures.
          </p>

          {/* Search Simulation Bar */}
          <div className="max-w-2xl mx-auto glass-panel p-2 flex items-center border border-cyber-blue/20 mb-6 shadow-2xl">
            <Search className="w-5 h-5 text-slate-400 ml-3" />
            <input 
              type="text" 
              placeholder="Enter name, username, or Gmail..." 
              value={simSearch}
              onChange={(e) => setSimSearch(e.target.value)}
              className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 px-3 text-base placeholder-slate-500"
            />
            <button 
              onClick={() => window.location.href = `/register?search=${encodeURIComponent(simSearch)}`}
              className="px-6 py-3 bg-cyber-blue text-cyber-dark font-extrabold rounded-lg hover:bg-cyber-teal transition flex items-center gap-2 cursor-pointer shadow-lg"
            >
              Analyze Footprint <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 font-mono">100% Secure. We never save queries, bypass log-ins, or scrape private datasets.</p>
        </div>
      </section>

      {/* --- ONBOARDING FOOTPRINT QUIZ --- */}
      <section id="quiz" className="py-20 border-b border-cyber-border/20 bg-cyber-gray/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-2 font-mono">EXPOSURE ESTIMATOR</h2>
            <p className="text-slate-400">Answer 5 simple questions to estimate your public footprint size.</p>
          </div>

          <div className="glass-panel p-8 border border-cyber-blue/20 max-w-xl mx-auto relative overflow-hidden">
            {quizStep < 5 && (
              <div className="w-full bg-slate-800 h-1.5 absolute top-0 left-0">
                <div 
                  className="bg-cyber-blue h-1.5 transition-all duration-300"
                  style={{ width: `${(quizStep / 5) * 100}%` }}
                ></div>
              </div>
            )}

            {quizStep === 0 && (
              <div className="text-center">
                <Lock className="w-12 h-12 text-cyber-blue mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3 text-white">Q1: Password Hygiene</h3>
                <p className="text-slate-400 mb-6">Do you reuse passwords (or close variants) across different platforms or websites?</p>
                <div className="flex gap-4 justify-center">
                  <button onClick={() => handleQuizAnswer('passwordReuse', true)} className="px-6 py-2.5 bg-red-500/10 border border-red-500/50 hover:bg-red-500 hover:text-white rounded-lg transition duration-200 cursor-pointer font-bold w-24">Yes</button>
                  <button onClick={() => handleQuizAnswer('passwordReuse', false)} className="px-6 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition duration-200 cursor-pointer font-bold w-24">No</button>
                </div>
              </div>
            )}

            {quizStep === 1 && (
              <div className="text-center">
                <MapPin className="w-12 h-12 text-cyber-blue mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3 text-white">Q2: Geolocation Leaks</h3>
                <p className="text-slate-400 mb-6">Do you share or upload smartphone photos (avatars, status posts) without stripping location tags?</p>
                <div className="flex gap-4 justify-center">
                  <button onClick={() => handleQuizAnswer('photosGeo', true)} className="px-6 py-2.5 bg-red-500/10 border border-red-500/50 hover:bg-red-500 hover:text-white rounded-lg transition duration-200 cursor-pointer font-bold w-24">Yes</button>
                  <button onClick={() => handleQuizAnswer('photosGeo', false)} className="px-6 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition duration-200 cursor-pointer font-bold w-24">No</button>
                </div>
              </div>
            )}

            {quizStep === 2 && (
              <div className="text-center">
                <Eye className="w-12 h-12 text-cyber-blue mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3 text-white">Q3: Profile Breadth</h3>
                <p className="text-slate-400 mb-6">Do you have accounts registered on 15+ different platforms (socials, shopping, forums, gaming)?</p>
                <div className="flex gap-4 justify-center">
                  <button onClick={() => handleQuizAnswer('manyAccounts', true)} className="px-6 py-2.5 bg-red-500/10 border border-red-500/50 hover:bg-red-500 hover:text-white rounded-lg transition duration-200 cursor-pointer font-bold w-24">Yes</button>
                  <button onClick={() => handleQuizAnswer('manyAccounts', false)} className="px-6 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition duration-200 cursor-pointer font-bold w-24">No</button>
                </div>
              </div>
            )}

            {quizStep === 3 && (
              <div className="text-center">
                <Search className="w-12 h-12 text-cyber-blue mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3 text-white">Q4: Data Leak Awareness</h3>
                <p className="text-slate-400 mb-6">Have you ever checked if your primary email was leaked in a historical data breach (like Canva or LinkedIn)?</p>
                <div className="flex gap-4 justify-center">
                  <button onClick={() => handleQuizAnswer('checkedBreaches', true)} className="px-6 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition duration-200 cursor-pointer font-bold w-24">Yes</button>
                  <button onClick={() => handleQuizAnswer('checkedBreaches', false)} className="px-6 py-2.5 bg-red-500/10 border border-red-500/50 hover:bg-red-500 hover:text-white rounded-lg transition duration-200 cursor-pointer font-bold w-24">No</button>
                </div>
              </div>
            )}

            {quizStep === 4 && (
              <div className="text-center">
                <Mail className="w-12 h-12 text-cyber-blue mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3 text-white">Q5: Directory Privacy</h3>
                <p className="text-slate-400 mb-6">Are your details or name searchable on public identity directories like Truecaller or Justdial?</p>
                <div className="flex gap-4 justify-center">
                  <button onClick={() => handleQuizAnswer('truecallerActive', true)} className="px-6 py-2.5 bg-red-500/10 border border-red-500/50 hover:bg-red-500 hover:text-white rounded-lg transition duration-200 cursor-pointer font-bold w-24">Yes</button>
                  <button onClick={() => handleQuizAnswer('truecallerActive', false)} className="px-6 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition duration-200 cursor-pointer font-bold w-24">No</button>
                </div>
              </div>
            )}

            {quizStep === 5 && quizResult !== null && (
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-cyber-teal mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-1 text-white">ESTIMATED EXPOSURE</h3>
                <p className="text-4xl font-extrabold text-cyber-blue mb-4 font-mono">{quizResult}/100</p>
                
                <div className="text-left bg-slate-900/50 p-4 border border-slate-800 rounded-lg mb-6">
                  <p className="text-sm font-semibold mb-2">Footprint Summary:</p>
                  <ul className="text-xs space-y-1 text-slate-400 list-disc list-inside">
                    {quizAnswers.passwordReuse && <li>Password reuse creates vulnerability to Credential Stuffing attacks.</li>}
                    {quizAnswers.photosGeo && <li>EXIF coordinates in photos compromise physical location secrecy.</li>}
                    {quizAnswers.manyAccounts && <li>High surface area of usernames allows active profile tracking.</li>}
                    {quizAnswers.truecallerActive && <li>Public directory exposure leaves you open to banking phone scams.</li>}
                  </ul>
                </div>

                <div className="flex gap-4 justify-center">
                  <button onClick={() => window.location.href = '/register'} className="px-6 py-2.5 bg-cyber-blue text-cyber-dark font-extrabold rounded-lg hover:bg-cyber-teal transition cursor-pointer">
                    Wipe My Footprint
                  </button>
                  <button onClick={resetQuiz} className="px-6 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition cursor-pointer">
                    Retake Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6 border-b border-cyber-border/20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white mb-2 font-mono">AUDITING CAPABILITIES</h2>
          <p className="text-slate-400">Discover where your details are stored, how they are linked, and remove them.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass-panel p-8 glass-panel-hover">
            <Search className="w-10 h-10 text-cyber-blue mb-6" />
            <h3 className="text-xl font-bold mb-3 text-white">Sherlock Username Prober</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Checks 30+ services concurrently to pinpoint active accounts sharing your username. Identifies where you have exposed profiles.
            </p>
          </div>

          <div className="glass-panel p-8 glass-panel-hover">
            <Mail className="w-10 h-10 text-cyber-teal mb-6" />
            <h3 className="text-xl font-bold mb-3 text-white">GHunt Google OSINT</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Analyzes target Gmails to map Gaia IDs, public review locations, active Google services, and calendar availability status.
            </p>
          </div>

          <div className="glass-panel p-8 glass-panel-hover">
            <Shield className="w-10 h-10 text-cyber-purple mb-6" />
            <h3 className="text-xl font-bold mb-3 text-white">Local Leak Database</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Indexes 1,000+ realistic breach logs offline. Immediately reports if your credentials have been compromised in past hacks.
            </p>
          </div>

          <div className="glass-panel p-8 glass-panel-hover">
            <FileText className="w-10 h-10 text-cyber-neon mb-6" />
            <h3 className="text-xl font-bold mb-3 text-white">Metadata Stripper</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Extracts and strips hidden author strings, company templates, and precise GPS coordinates from JPEG, PDF, and DOCX files.
            </p>
          </div>

          <div className="glass-panel p-8 glass-panel-hover">
            <Trash2 className="w-10 h-10 text-cyber-blue mb-6" />
            <h3 className="text-xl font-bold mb-3 text-white">India DPDP Deletion</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Generates legal notices under Section 12 of the DPDP Act 2023. Targets Grievance Officers to erase your data from Indian companies.
            </p>
          </div>

          <div className="glass-panel p-8 glass-panel-hover">
            <Eye className="w-10 h-10 text-cyber-teal mb-6" />
            <h3 className="text-xl font-bold mb-3 text-white">FaceCheck.ID Biometrics</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Leverages FaceCheck.ID API to run biometric image searches, verifying where else your profile photo exists across the web.
            </p>
          </div>
        </div>
      </section>

      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="py-24 max-w-5xl mx-auto px-6 border-b border-cyber-border/20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white mb-2 font-mono">PLANS & PRICING</h2>
          <p className="text-slate-400">Access self-contained scanners or get continuous automated privacy scrubbing.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="glass-panel p-8 border border-slate-800">
            <h3 className="text-xl font-bold text-white mb-2">Free Core Scan</h3>
            <p className="text-4xl font-extrabold text-white mb-4">$0 <span className="text-sm font-normal text-slate-500">/ month</span></p>
            <p className="text-slate-400 text-sm mb-6">Wipe metadata and audit footprints manually.</p>
            <ul className="text-sm space-y-3 mb-8 text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyber-blue" /> Sherlock Username Scan</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyber-blue" /> JPG EXIF & Document Stripper</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyber-blue" /> Local Breach Database Resolver</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyber-blue" /> DPDP / GDPR Deletion Generator</li>
            </ul>
            <a href="/register" className="block text-center w-full py-2.5 border border-slate-700 hover:border-cyber-blue hover:text-cyber-blue text-sm font-bold rounded-lg transition duration-200">
              Get Free Account
            </a>
          </div>

          {/* Pro Plan */}
          <div className="glass-panel p-8 border border-cyber-blue/40 relative">
            <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-cyber-blue text-cyber-dark text-xs font-bold rounded-full uppercase tracking-wider">
              Recommended
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Automated Shield</h3>
            <p className="text-4xl font-extrabold text-cyber-blue mb-4">$9 <span className="text-sm font-normal text-slate-500">/ month</span></p>
            <p className="text-slate-400 text-sm mb-6">Continuous background checks and broker removal requests.</p>
            <ul className="text-sm space-y-3 mb-8 text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyber-teal" /> Everything in Free</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyber-teal" /> Automated Data Broker Suppressions</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyber-teal" /> Recurring Weekly Breach Scans</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyber-teal" /> AI Advisor Custom Remediation</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyber-teal" /> Unlimited FaceCheck.ID API Checks</li>
            </ul>
            <a href="/register?plan=pro" className="block text-center w-full py-2.5 bg-cyber-blue hover:bg-cyber-teal text-cyber-dark font-extrabold text-sm rounded-lg transition duration-200 shadow-lg shadow-cyber-blue/10">
              Go Pro
            </a>
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6 border-b border-cyber-border/20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white mb-2 font-mono">QUESTIONS & ANSWERS</h2>
          <p className="text-slate-400">Everything you need to know about the Aegis Footprint Analyzer.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="glass-panel border border-slate-800/80 overflow-hidden">
              <button 
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-6 text-left font-bold text-white flex items-center justify-between hover:text-cyber-blue transition cursor-pointer"
              >
                <span>{faq.q}</span>
                <HelpCircle className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-cyber-blue' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-slate-900/60 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* --- CONTACT / FEEDBACK FORM --- */}
      <section id="contact" className="py-24 max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white mb-2 font-mono">FEEDBACK & SUPPORT</h2>
          <p className="text-slate-400">Send us feedback or query us. We respond within 24 hours.</p>
        </div>

        <div className="glass-panel p-8 border border-slate-800">
          <form onSubmit={handleFeedbackSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono">Your Name</label>
                <input 
                  type="text" 
                  value={feedback.name}
                  onChange={(e) => setFeedback(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-slate-900/40 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-cyber-blue text-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono">Email Address</label>
                <input 
                  type="email" 
                  value={feedback.email}
                  onChange={(e) => setFeedback(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full bg-slate-900/40 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-cyber-blue text-white" 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase font-mono">Message</label>
              <textarea 
                rows={4}
                value={feedback.message}
                onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
                required
                className="w-full bg-slate-900/40 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:border-cyber-blue text-white"
              ></textarea>
            </div>
            
            {feedbackSuccess && (
              <p className="text-sm text-cyber-teal font-semibold">Feedback submitted successfully. Thank you for your review!</p>
            )}
            {feedbackError && (
              <p className="text-sm text-red-400 font-semibold">{feedbackError}</p>
            )}

            <button 
              type="submit" 
              className="w-full py-3 bg-cyber-blue text-cyber-dark font-extrabold rounded-lg hover:bg-cyber-teal transition cursor-pointer shadow-lg shadow-cyber-blue/10"
            >
              Submit Message
            </button>
          </form>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-cyber-border/40 py-12 bg-cyber-dark">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyber-blue" />
            <span className="font-bold font-mono tracking-wider">AEGIS.OSINT</span>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            &copy; 2026 Aegis Privacy. Designed for ethical digital audits and personal data removal.
          </p>
          <div className="flex gap-6 text-xs text-slate-400 font-semibold">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Use</a>
            <a href="#" className="hover:text-white transition">Indian DPDP Compliance</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

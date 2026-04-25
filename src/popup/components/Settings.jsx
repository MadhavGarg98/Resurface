import React, { useState, useEffect } from 'react';
import { Save, Shield, Database, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { getSettings, saveSettings } from '../../utils/storage.js';
import { testConnection } from '../../utils/llmClient.js';

export default function Settings({ isCompact = false }) {
  const [settings, setSettings] = useState({
    groqApiKey: '',
    geminiApiKey: '',
    preferredOrder: 'Groq first (fastest)'
  });
  const [status, setStatus] = useState('idle'); // idle, testing, success, error
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saved

  useEffect(() => {
    async function load() {
      const s = await getSettings();
      setSettings(s);
    }
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    await saveSettings(settings);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleTest = async () => {
    setStatus('testing');
    const result = await testConnection();
    setStatus(result ? 'success' : 'error');
  };

  return (
    <div className={`space-y-6 ${isCompact ? '' : 'max-w-xl'}`}>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white border border-[#F0EBD8] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#F5A623] mb-2">
            <Shield size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">AI API Keys</h3>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#9B9B9B] uppercase tracking-widest">Groq API Key</label>
            <input
              type="password"
              value={settings.groqApiKey}
              onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
              placeholder="gsk_..."
              className="w-full bg-[#FFFDF7] border border-[#F0EBD8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#9B9B9B] uppercase tracking-widest">Gemini API Key</label>
            <input
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
              placeholder="AIza..."
              className="w-full bg-[#FFFDF7] border border-[#F0EBD8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors"
            />
          </div>
        </div>

        <div className="bg-white border border-[#F0EBD8] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#F5A623] mb-2">
            <Database size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Storage & Logic</h3>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#9B9B9B] uppercase tracking-widest">AI Priority</label>
            <select
              value={settings.preferredOrder}
              onChange={(e) => setSettings({ ...settings, preferredOrder: e.target.value })}
              className="w-full bg-[#FFFDF7] border border-[#F0EBD8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors appearance-none"
            >
              <option>Groq first (fastest)</option>
              <option>Gemini first (larger context)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saveStatus === 'saved'}
            className="flex-1 bg-[#F5A623] hover:bg-[#E09512] text-white font-bold py-3 rounded-xl shadow-lg shadow-[#F5A623]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {saveStatus === 'saved' ? <Check size={18} /> : <Save size={18} />}
            <span>{saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleTest}
            disabled={status === 'testing'}
            className={`px-6 py-3 border-2 border-[#F0EBD8] rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              status === 'success' ? 'border-green-200 text-green-600 bg-green-50' :
              status === 'error' ? 'border-red-200 text-red-500 bg-red-50' :
              'hover:border-[#F5A623] hover:text-[#F5A623] text-[#6B6B6B]'
            }`}
          >
            {status === 'testing' ? <RefreshCw size={18} className="animate-spin" /> : 
             status === 'success' ? <Check size={18} /> :
             status === 'error' ? <AlertTriangle size={18} /> :
             <RefreshCw size={18} />}
            {!isCompact && <span>Test Connection</span>}
          </button>
        </div>
      </form>

      {!isCompact && (
        <div className="bg-[#FFF8E7] border border-[#F5A623]/20 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="text-[#F5A623] mt-0.5" size={16} />
          <div className="text-xs text-[#6B6B6B] leading-relaxed">
            <p className="font-bold text-[#1A1A1A] mb-1">Privacy First</p>
            Keys are stored locally in your browser. Resurface uses direct API calls to Groq and Gemini. No data is sent to our servers.
          </div>
        </div>
      )}
    </div>
  );
}

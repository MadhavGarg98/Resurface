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
        <div className="bg-white border border-[#E8E2D6] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#C49A6C] mb-2">
            <Shield size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">AI API Keys</h3>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">Groq API Key</label>
            <input
              type="password"
              value={settings.groqApiKey}
              onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
              placeholder="gsk_..."
              className="w-full bg-[#FAF8F5] border border-[#E8E2D6] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C49A6C] transition-colors text-[#3D3832]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">Gemini API Key</label>
            <input
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
              placeholder="AIza..."
              className="w-full bg-[#FAF8F5] border border-[#E8E2D6] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C49A6C] transition-colors text-[#3D3832]"
            />
          </div>
        </div>

        <div className="bg-white border border-[#E8E2D6] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#C49A6C] mb-2">
            <Database size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Storage & Logic</h3>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">AI Priority</label>
            <select
              value={settings.preferredOrder}
              onChange={(e) => setSettings({ ...settings, preferredOrder: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-[#E8E2D6] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C49A6C] transition-colors appearance-none text-[#3D3832]"
            >
              <option>Groq first (fastest)</option>
              <option>Gemini first (larger context)</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-[#E8E2D6] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#C49A6C] mb-2">
            <RefreshCw size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Proactive Features</h3>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#E8E2D6] rounded-xl">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[#3D3832]">AI Chat Bot</p>
              <p className="text-[10px] text-[#A8A29E]">Show floating chat bubble on all pages</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.showFloatingChat !== false}
                onChange={(e) => {
                  const newState = e.target.checked;
                  setSettings({ ...settings, showFloatingChat: newState });
                  chrome.storage.local.set({ showFloatingChat: newState });
                }}
              />
              <div className="w-11 h-6 bg-[#E8E2D6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C49A6C]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#E8E2D6] rounded-xl">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[#3D3832]">Resurface Sidebar</p>
              <p className="text-[10px] text-[#A8A29E]">Show saved resources on matching pages</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.sidebarEnabled !== false}
                onChange={(e) => {
                  const newState = e.target.checked;
                  setSettings({ ...settings, sidebarEnabled: newState });
                  // Also update the dedicated key for the background script
                  chrome.storage.local.set({ sidebarEnabled: newState });
                }}
              />
              <div className="w-11 h-6 bg-[#E8E2D6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C49A6C]"></div>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saveStatus === 'saved'}
            className="flex-1 bg-[#C49A6C] hover:bg-[#B08D63] text-white font-bold py-3 rounded-xl shadow-lg shadow-[#C49A6C]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {saveStatus === 'saved' ? <Check size={18} /> : <Save size={18} />}
            <span>{saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleTest}
            disabled={status === 'testing'}
            className={`px-6 py-3 border-2 border-[#E8E2D6] rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              status === 'success' ? 'border-green-200 text-green-600 bg-green-50' :
              status === 'error' ? 'border-red-200 text-red-500 bg-red-50' :
              'hover:border-[#C49A6C] hover:text-[#C49A6C] text-[#A8A29E]'
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
        <div className="bg-[#FAF8F5] border border-[#C49A6C]/20 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="text-[#C49A6C] mt-0.5" size={16} />
          <div className="text-xs text-[#A8A29E] leading-relaxed">
            <p className="font-bold text-[#3D3832] mb-1">Privacy First</p>
            Keys are stored locally in your browser. Resurface uses direct API calls to Groq and Gemini. No data is sent to our servers.
          </div>
        </div>
      )}
    </div>
  );
}

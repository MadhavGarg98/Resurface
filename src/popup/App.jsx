import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, LayoutGrid, ArrowLeft, ExternalLink, Database, ChevronRight, Pin } from 'lucide-react';
import QuickPopupSearchBar from './components/QuickPopupSearchBar.jsx';
import QuickSaveButton from './components/QuickSaveButton.jsx';
import RecentResourcesList from './components/RecentResourcesList.jsx';
import Settings from './components/Settings.jsx';
import ClassificationConfirm from './components/ClassificationConfirm.jsx';
import { openFullDashboard } from '../utils/navigation.js';
import { updateResource } from '../utils/storage.js';

export default function App() {
  const [view, setView] = useState('main'); // main, settings, detail
  const [selectedResource, setSelectedResource] = useState(null);
  const [pendingClassification, setPendingClassification] = useState(null);
  const [isSidebarEnabled, setIsSidebarEnabled] = useState(true);

  useEffect(() => {
    // Load sidebar setting
    chrome.storage.local.get(['sidebarEnabled'], (result) => {
      if (result.sidebarEnabled !== undefined) {
        setIsSidebarEnabled(result.sidebarEnabled);
      }
    });

    // Check for pending classification
    chrome.storage.local.get(['_pendingClassification'], (result) => {
      if (result._pendingClassification) {
        setPendingClassification(result._pendingClassification);
      }
    });
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarEnabled;
    setIsSidebarEnabled(newState);
    chrome.storage.local.set({ sidebarEnabled: newState });
    console.log('[Popup] Sidebar enabled:', newState);
  };

  const handleConfirmClassification = async (projectId, tags) => {
    if (!pendingClassification) return;
    
    const { resource } = pendingClassification;
    let resourceId = resource.id;
    
    // Fallback for resources saved before the fix (match by URL and Title)
    if (!resourceId) {
      const { getResources } = await import('../utils/storage.js');
      const all = await getResources();
      const match = all.find(r => r.url === resource.url && r.title === resource.title);
      if (match) resourceId = match.id;
    }
    
    if (resourceId) {
      await updateResource(resourceId, { 
        projectId, 
        tags: [...new Set([...(resource.tags || []), ...(tags || [])])],
        _needsConfirmation: false,
        _pendingClassification: null
      });
    }
    
    // Clear pending state
    await chrome.storage.local.remove(['_pendingClassification']);
    setPendingClassification(null);
    
    // Refresh the list
    window.dispatchEvent(new CustomEvent('resource-updated'));
  };

  const handleDismissClassification = async () => {
    if (!pendingClassification) return;
    
    const { resource } = pendingClassification;
    let resourceId = resource.id;
    
    if (!resourceId) {
      const { getResources } = await import('../utils/storage.js');
      const all = await getResources();
      const match = all.find(r => r.url === resource.url && r.title === resource.title);
      if (match) resourceId = match.id;
    }
    
    if (resourceId) {
      await updateResource(resourceId, { 
        _needsConfirmation: false,
        _pendingClassification: null
      });
    }
    
    await chrome.storage.local.remove(['_pendingClassification']);
    setPendingClassification(null);
  };

  const handleResultClick = (resource) => {
    setSelectedResource(resource);
    setView('detail');
  };

  const testSave = async () => {
    const testResource = {
      id: 'test-' + Date.now(),
      type: 'link',
      title: 'Diagnostic Test ' + new Date().toLocaleTimeString(),
      url: 'https://resurface.test',
      textContent: 'This is a diagnostic test resource to verify storage functionality.',
      summary: 'Storage is working correctly!',
      tags: ['diagnostic'],
      projectId: null,
      savedAt: new Date().toISOString(),
      readStatus: 'unread',
      accessCount: 0
    };
    
    console.log('Saving test resource:', testResource);
    
    try {
      const { saveResource, getResources } = await import('../utils/storage.js');
      await saveResource(testResource);
      const all = await getResources();
      alert('Diagnostic Save Successful!\nTotal items in storage: ' + all.length);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Save failed: ' + error.message);
    }
  };

  return (
    <div className="w-[350px] h-[400px] bg-[#FFFDF7] overflow-hidden flex flex-col font-sans">
      <AnimatePresence mode="wait">
        {view === 'main' ? (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full p-5 space-y-6"
          >
            <QuickPopupSearchBar onResultClick={handleResultClick} />
            
            <AnimatePresence>
              {pendingClassification && (
                <ClassificationConfirm
                  classification={pendingClassification.classification}
                  resource={pendingClassification.resource}
                  onConfirm={handleConfirmClassification}
                  onDismiss={handleDismissClassification}
                />
              )}
            </AnimatePresence>

            <QuickSaveButton />



            <div className="flex-1 overflow-hidden flex flex-col">
              <h3 className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-wider mb-3">
                Recent Resources
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <RecentResourcesList onSelect={handleResultClick} />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8E2D6] flex items-center justify-between">
              <button
                onClick={openFullDashboard}
                className="flex items-center gap-1.5 text-xs font-bold text-[#C49A6C] hover:text-[#3D3832] transition-colors"
              >
                <LayoutGrid size={14} />
                <span>Open Full Dashboard</span>
                <ChevronRight size={14} className="mt-0.5" />
              </button>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={testSave}
                  title="Diagnostic Save"
                  className="p-1.5 text-[#A8A29E] hover:text-[#C49A6C] hover:bg-[#FAF8F5] rounded-lg transition-all"
                >
                  <Database size={16} />
                </button>
                <button
                  onClick={() => setView('settings')}
                  className="p-1.5 text-[#A8A29E] hover:text-[#C49A6C] hover:bg-[#FAF8F5] rounded-lg transition-all"
                >
                  <SettingsIcon size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ) : view === 'settings' ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full p-5"
          >
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setView('main')}
                className="p-1.5 text-[#9B9B9B] hover:text-[#1A1A1A] hover:bg-[#F0EBD8] rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-sm font-bold text-[#1A1A1A]">Settings</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <Settings isCompact={true} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setView('main')}
                className="p-1.5 text-[#9B9B9B] hover:text-[#1A1A1A] hover:bg-[#F0EBD8] rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-sm font-bold text-[#1A1A1A] truncate max-w-[200px]">
                {selectedResource?.title}
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#C49A6C]/20">
                <p className="text-xs text-[#3D3832] leading-relaxed italic">
                  "{selectedResource?.summary || 'No summary available.'}"
                </p>
              </div>

              {selectedResource?.bulletSummary && selectedResource.bulletSummary.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-[#9B9B9B] uppercase tracking-widest">Key Takeaways</h4>
                  <ul className="space-y-2">
                    {selectedResource.bulletSummary.map((bullet, i) => (
                      <li key={i} className="flex gap-2 text-xs text-[#6B6B6B]">
                        <div className="mt-1.5 w-1 h-1 rounded-full bg-[#C49A6C] flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => chrome.tabs.create({ url: selectedResource.url })}
                className="w-full bg-[#C49A6C] text-white font-bold py-3 rounded-xl shadow-lg shadow-[#C49A6C]/10 transition-all flex items-center justify-center gap-2 text-xs"
              >
                <ExternalLink size={14} />
                <span>Open Original Source</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState } from 'react';
import { Loader2, Check, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuickSaveButton() {
  const [status, setStatus] = useState('idle'); // idle, saving, saved

  const handleSave = async () => {
    setStatus('saving');
    // We send a message to the background script to trigger the save command logic
    chrome.runtime.sendMessage({ action: 'save-current-page' }, (response) => {
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    });
  };

  return (
    <button
      onClick={handleSave}
      disabled={status === 'saving'}
      className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg ${
        status === 'saved' 
          ? 'bg-[#81C784] text-white shadow-[#81C784]/20' 
          : 'bg-[#C49A6C] hover:bg-[#3D3832] text-white shadow-[#C49A6C]/20'
      }`}
    >
      <AnimatePresence mode="wait">
        {status === 'saving' ? (
          <motion.div
            key="saving"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Loader2 className="w-5 h-5 animate-spin" />
          </motion.div>
        ) : status === 'saved' ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Check className="w-5 h-5" />
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-3"
          >
            <Save className="w-5 h-5" />
            <span>Save Current Page</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, 
  ExternalLink, 
  Clock, 
  Tag, 
  FileText, 
  Calendar,
  CheckCircle,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { deleteResource } from '../../utils/storage.js';

export default function ResourceDetailModal({ resource, project, isOpen, onClose, onUpdate }) {
  if (!resource) return null;

  const timeAgo = new Date(resource.savedAt).toLocaleDateString([], { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleOpenLink = () => {
    if (resource.url) window.open(resource.url, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl h-full bg-[#FAF8F5] shadow-2xl flex flex-col border-l border-[#E8E2D6]"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#E8E2D6] flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <button 
                onClick={onClose}
                className="p-2 text-[#A8A29E] hover:text-[#3D3832] hover:bg-[#E8E2D6]/50 rounded-xl transition-all flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-bold">Back</span>
              </button>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleOpenLink}
                  className="bg-[#C49A6C] hover:bg-[#B5895B] text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-[#C49A6C]/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  <ExternalLink size={16} />
                  <span>Open Website</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              {/* Title & Meta */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  {project && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                      <Tag size={12} />
                      {project.name}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[#E8E2D6] text-[#3D3832]">
                    <Clock size={12} />
                    {timeAgo}
                  </div>
                </div>
                
                <h2 className="text-3xl font-black text-[#3D3832] leading-tight tracking-tight">
                  {resource.title}
                </h2>
                
                <button 
                  onClick={handleOpenLink}
                  className="text-sm font-medium text-[#A8A29E] hover:text-[#C49A6C] transition-colors truncate block max-w-md"
                >
                  {resource.url}
                </button>
              </section>

              {/* AI Summary Card */}
              <section className="bg-white border border-[#E8E2D6] rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <img 
                    src={typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/favicon.png') : '/icons/favicon.png'} 
                    style={{ width: 80, height: 80 }} 
                    className="object-contain grayscale" 
                    alt="" 
                  />
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2 text-[#C49A6C] mb-4">
                    <img 
                      src={typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/favicon.png') : '/icons/favicon.png'} 
                      style={{ width: 20, height: 20 }} 
                      className="object-contain" 
                      alt="" 
                    />
                    <h3 className="text-xs font-black uppercase tracking-widest">AI Summary</h3>
                  </div>
                  <p className="text-lg text-[#3D3832] leading-relaxed font-medium italic">
                    "{resource.summary || 'Summary not available.'}"
                  </p>
                </div>
              </section>

              {/* Key Takeaways */}
              {resource.bulletSummary && resource.bulletSummary.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-[#A8A29E] uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle size={14} className="text-[#C49A6C]" />
                    Key Takeaways
                  </h3>
                  <div className="space-y-3">
                    {resource.bulletSummary.map((bullet, i) => (
                      <div key={i} className="flex gap-3 group">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C49A6C] flex-shrink-0" />
                        <p className="text-[#3D3832] leading-relaxed text-sm">{bullet}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Original Content */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-[#A8A29E] uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} />
                  Captured Content
                </h3>
                <div className="bg-white border border-[#E8E2D6] rounded-2xl p-6 text-sm text-[#3D3832]/80 leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
                  {resource.textContent || 'No text content captured.'}
                </div>
              </section>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-[#E8E2D6] bg-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">
                <span>Viewed {resource.accessCount || 0} times</span>
                {resource.aiProvider && (
                  <>
                    <span>•</span>
                    <span className="text-[#C49A6C]">Processed by {resource.aiProvider}</span>
                  </>
                )}
              </div>
              
              <button 
                onClick={async () => {
                  if (window.confirm('Delete this resource?')) {
                    await deleteResource(resource.id);
                    onUpdate?.();
                    onClose();
                  }
                }}
                className="flex items-center gap-2 text-[#C49A6C] hover:text-[#B5895B] font-bold text-sm transition-colors px-4 py-2 hover:bg-[#FAF8F5] rounded-xl"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Simple internal component
function ArrowLeft({ size }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
  );
}

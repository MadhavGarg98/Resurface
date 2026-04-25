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
  Zap,
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
            className="relative w-full max-w-2xl h-full bg-[#FFFDF7] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#F0EBD8] flex items-center justify-between bg-white">
              <button 
                onClick={onClose}
                className="p-2 text-[#9B9B9B] hover:text-[#1A1A1A] hover:bg-[#F0EBD8] rounded-xl transition-all flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-bold">Back</span>
              </button>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleOpenLink}
                  className="bg-[#F5A623] hover:bg-[#E09512] text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-[#F5A623]/20 transition-all flex items-center gap-2"
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
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[#F0EBD8] text-[#6B6B6B]">
                    <Clock size={12} />
                    {timeAgo}
                  </div>
                </div>
                
                <h2 className="text-3xl font-black text-[#1A1A1A] leading-tight tracking-tight">
                  {resource.title}
                </h2>
                
                <button 
                  onClick={handleOpenLink}
                  className="text-sm font-medium text-[#9B9B9B] hover:text-[#F5A623] transition-colors truncate block max-w-md"
                >
                  {resource.url}
                </button>
              </section>

              {/* AI Summary Card */}
              <section className="bg-white border border-[#F0EBD8] rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Zap size={64} className="text-[#F5A623] fill-current" />
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2 text-[#F5A623] mb-4">
                    <Zap size={18} className="fill-current" />
                    <h3 className="text-xs font-black uppercase tracking-widest">AI Summary</h3>
                  </div>
                  <p className="text-lg text-[#1A1A1A] leading-relaxed font-medium italic">
                    "{resource.summary || 'Summary not available.'}"
                  </p>
                </div>
              </section>

              {/* Key Takeaways */}
              {resource.bulletSummary && resource.bulletSummary.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-[#9B9B9B] uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    Key Takeaways
                  </h3>
                  <div className="space-y-3">
                    {resource.bulletSummary.map((bullet, i) => (
                      <div key={i} className="flex gap-3 group">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#F5A623] flex-shrink-0" />
                        <p className="text-[#1A1A1A] leading-relaxed text-sm">{bullet}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Original Content */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-[#9B9B9B] uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} />
                  Captured Content
                </h3>
                <div className="bg-[#FFFDF7] border border-[#F0EBD8] rounded-2xl p-6 text-sm text-[#6B6B6B] leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
                  {resource.textContent || 'No text content captured.'}
                </div>
              </section>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-[#F0EBD8] bg-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#9B9B9B] uppercase tracking-wider">
                <span>Viewed {resource.accessCount || 0} times</span>
                {resource.aiProvider && (
                  <>
                    <span>•</span>
                    <span className="text-[#F5A623]">Processed by {resource.aiProvider}</span>
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
                className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold text-sm transition-colors px-4 py-2 hover:bg-red-50 rounded-xl"
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

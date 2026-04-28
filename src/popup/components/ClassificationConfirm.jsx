import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown, Plus, Edit3 } from 'lucide-react';

/**
 * Classification Confirmation Component
 * 
 * Shows when AI is unsure about categorization
 * Auto-dismisses after 8 seconds (assigns to best match)
 */
export default function ClassificationConfirm({ 
  classification, 
  resource,
  onConfirm, 
  onDismiss,
  onCreateProject 
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(
    classification.projectId || (classification.alternatives?.[0]?.projectId) || null
  );
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25);
  const [isCreating, setIsCreating] = useState(false);
  const [resourceTitle, setResourceTitle] = useState(resource?.title || 'Untitled');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Auto-dismiss timer
  useEffect(() => {
    if (timeLeft <= 0) {
      // Auto-confirm with best match
      if (selectedProjectId) {
        onConfirm(selectedProjectId, classification.suggestedTags, resourceTitle);
      } else {
        onDismiss();
      }
      return;
    }
    
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);
  
  const confidenceColor = classification.confidence >= 90 ? '#C49A6C' :
                           classification.confidence >= 60 ? '#8B7E74' : '#A8A29E';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="bg-[#FAF8F5] border border-[#E8E2D6] rounded-xl p-4 shadow-lg max-w-md mx-auto"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <img 
          src={typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/favicon.png') : '/icons/favicon.png'} 
          className="w-10 h-10 object-contain flex-shrink-0" 
          alt="AI Assistant" 
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <input 
                value={resourceTitle}
                onChange={(e) => setResourceTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                autoFocus
                className="text-xs font-bold text-[#3D3832] bg-white border border-[#C49A6C] rounded px-2 py-0.5 w-full outline-none"
              />
            ) : (
              <h3 
                className="text-sm font-semibold text-[#3D3832] truncate cursor-pointer hover:text-[#C49A6C] flex items-center gap-1.5"
                onClick={() => setIsEditingTitle(true)}
              >
                {resourceTitle}
                <Edit3 className="w-3 h-3 text-[#A8A29E]" />
              </h3>
            )}
          </div>
          <p className="text-[10px] text-[#A8A29E] mt-0.5 uppercase font-bold tracking-wider">
            {classification.projectId ? 'Project Suggestion' : 'Needs Classification'}
          </p>
          
          {/* Confidence bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#E8E2D6] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${classification.confidence}%`,
                  backgroundColor: confidenceColor
                }}
              />
            </div>
            <span 
              className="text-[10px] font-black uppercase tracking-tighter"
              style={{ color: confidenceColor }}
            >
              {classification.confidence}% match
            </span>
          </div>
        </div>
        
        {/* Timer */}
        <div className="text-center flex-shrink-0">
          <div className="w-8 h-8 rounded-full border-2 border-[#E8E2D6] flex items-center justify-center">
            <span className="text-xs font-medium text-[#A8A29E]">{timeLeft}</span>
          </div>
          <span className="text-[9px] text-[#A8A29E] block mt-0.5">auto</span>
        </div>
      </div>
      
      {/* Best Match Card */}
      {classification.projectId && (
        <div 
          className={`p-3 rounded-lg border-2 cursor-pointer transition-all mb-2 ${
            selectedProjectId === classification.projectId 
              ? 'border-[#C49A6C] bg-white' 
              : 'border-[#E8E2D6] hover:border-[#D4C2AD] bg-white/50'
          }`}
          onClick={() => setSelectedProjectId(classification.projectId)}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[#3D3832]">
                📁 {classification.alternatives?.find(alt => alt.projectId === classification.projectId)?.projectName || 'Best Match'}
              </div>
              {classification.matchedKeywords?.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {classification.matchedKeywords.map((kw, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[#E8E2D6] text-[#C49A6C] rounded-full font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {selectedProjectId === classification.projectId && (
              <Check className="w-5 h-5 text-[#C49A6C]" />
            )}
          </div>
        </div>
      )}
      
      {/* Other Options */}
      {showAllOptions && classification.alternatives?.map((alt, i) => {
        if (alt.projectId === classification.projectId) return null;
        return (
          <div
            key={i}
            className={`p-3 rounded-lg border cursor-pointer transition-all mb-2 ${
              selectedProjectId === alt.projectId
                ? 'border-[#C49A6C] bg-white'
                : 'border-[#E8E2D6] hover:border-[#D4C2AD] bg-white/50'
            }`}
            onClick={() => setSelectedProjectId(alt.projectId)}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-[#3D3832]">
                  📁 {alt.projectName}
                </span>
                <span className="text-xs text-[#A8A29E] ml-2">
                  {alt.confidence}% match
                </span>
              </div>
              {selectedProjectId === alt.projectId && (
                <Check className="w-5 h-5 text-[#C49A6C]" />
              )}
            </div>
          </div>
        );
      })}
      
      {/* Show More / Create New */}
      <div className="flex gap-2">
        {classification.alternatives?.length > (classification.projectId ? 1 : 0) && (
          <button
            onClick={() => setShowAllOptions(!showAllOptions)}
            className="flex-1 text-[10px] font-black uppercase text-[#A8A29E] hover:text-[#C49A6C] py-2 flex items-center justify-center gap-1"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showAllOptions ? 'rotate-180' : ''}`} />
            {showAllOptions ? 'Fewer options' : 'See all options'}
          </button>
        )}
        
        <button
          onClick={() => setIsCreating(true)}
          className="flex-1 text-[10px] font-black uppercase text-[#A8A29E] hover:text-[#C49A6C] py-2 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Create new project
        </button>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onConfirm(selectedProjectId, classification.suggestedTags, resourceTitle)}
          disabled={!selectedProjectId}
          className="flex-1 h-9 bg-[#C49A6C] text-white text-sm font-bold rounded-lg hover:bg-[#B5895B] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#C49A6C]/20"
        >
          Confirm
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 h-9 border border-[#E8E2D6] text-[#A8A29E] text-sm font-bold rounded-lg hover:bg-white transition-all"
        >
          Skip
        </button>
      </div>
      
      {/* Create Project Modal (shown when isCreating) */}
      <AnimatePresence>
        {isCreating && (
          <CreateProjectInline
            suggestion={classification.suggestedNewProject}
            resource={resource}
            onCreated={(projectId) => {
              onConfirm(projectId, classification.suggestedTags, resourceTitle);
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Inline project creation component
 */
function CreateProjectInline({ suggestion, resource, onCreated, onCancel }) {
  const [name, setName] = useState(suggestion?.name || '');
  const [keywords, setKeywords] = useState((suggestion?.keywords || []).join(', '));
  const [isCreating, setIsCreating] = useState(false);
  
  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    
    try {
      const { saveProject } = await import('../../utils/storage.js');
      const project = {
        name: name.trim(),
        keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
        relatedUrls: [],
        deadline: null,
        color: suggestion?.color || '#C49A6C'
      };
      
      const saved = await saveProject(project);
      onCreated(saved.id);
    } catch (error) {
      console.error('Failed to create project:', error);
      setIsCreating(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 p-3 bg-white border border-[#E8E2D6] rounded-lg shadow-inner"
    >
      <h4 className="text-[10px] font-black uppercase text-[#3D3832] mb-2 tracking-widest">Create New Project</h4>
      
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        className="w-full h-8 px-3 text-sm border border-[#E8E2D6] rounded-lg mb-2 focus:outline-none focus:border-[#C49A6C] bg-[#FAF8F5] text-[#3D3832]"
        autoFocus
      />
      
      <input
        type="text"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="Keywords (comma separated)"
        className="w-full h-8 px-3 text-sm border border-[#E8E2D6] rounded-lg mb-2 focus:outline-none focus:border-[#C49A6C] bg-[#FAF8F5] text-[#3D3832]"
      />
      
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={!name.trim() || isCreating}
          className="flex-1 h-8 bg-[#C49A6C] text-white text-xs font-bold rounded-lg hover:bg-[#B5895B] disabled:opacity-40 transition-all shadow-sm"
        >
          {isCreating ? 'Creating...' : 'Create & Assign'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 h-8 border border-[#E8E2D6] text-[#A8A29E] text-xs font-bold rounded-lg hover:bg-white transition-all"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, X, Check } from 'lucide-react';

export default function ProjectCard({ 
  project, 
  resourceCount, 
  unreadCount, 
  onDelete, 
  onUpdate,
  onClick 
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name || '');
  const [editKeywords, setEditKeywords] = useState((project.keywords || []).join(', '));
  const [editUrls, setEditUrls] = useState((project.relatedUrls || []).join(', '));
  const [editDeadline, setEditDeadline] = useState(
    project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''
  );
  const [editColor, setEditColor] = useState(project.color || '#F5A623');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const projectColor = project.color || '#F5A623';
  const progress = resourceCount > 0 
    ? Math.round(((resourceCount - (unreadCount || 0)) / resourceCount) * 100) 
    : 0;

  // Format deadline
  const formatDeadline = () => {
    if (!project.deadline) return null;
    const deadline = new Date(project.deadline);
    const now = new Date();
    const diffMs = deadline - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'OVERDUE', color: '#E57373' };
    if (diffDays === 0) return { text: 'DUE TODAY', color: '#E57373' };
    if (diffDays === 1) return { text: 'Due tomorrow', color: '#F5A623' };
    if (diffDays <= 3) return { text: `${diffDays} days left`, color: '#F5A623' };
    if (diffDays <= 7) return { text: `${diffDays} days left`, color: '#4CAF50' };
    return { text: deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: '#9B9B9B' };
  };

  const deadlineInfo = formatDeadline();

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(project.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete project. Please try again.');
    }
    setIsDeleting(false);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      alert('Project name is required');
      return;
    }
    
    setIsSaving(true);
    try {
      const updates = {
        name: editName.trim(),
        keywords: editKeywords.split(',').map(k => k.trim()).filter(k => k),
        relatedUrls: editUrls.split(',').map(u => u.trim()).filter(u => u),
        deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
        color: editColor
      };
      
      await onUpdate(project.id, updates);
      setIsEditing(false);
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update project. Please try again.');
    }
    setIsSaving(false);
  };

  const colorOptions = ['#F5A623', '#4CAF50', '#2196F3', '#9C27B0', '#E57373', '#FF9800', '#00BCD4', '#607D8B'];

  // EDIT MODE
  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-[#F0EBD8] rounded-xl p-4 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {/* Project Name */}
          <div>
            <label className="text-xs font-medium text-[#6B6B6B] block mb-1">Project Name *</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-white border border-[#E5DFC8] rounded-lg focus:outline-none focus:border-[#F5A623] text-[#1A1A1A]"
              placeholder="My Project"
              autoFocus
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="text-xs font-medium text-[#6B6B6B] block mb-1">Keywords (comma separated)</label>
            <input
              type="text"
              value={editKeywords}
              onChange={(e) => setEditKeywords(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-white border border-[#E5DFC8] rounded-lg focus:outline-none focus:border-[#F5A623] text-[#1A1A1A]"
              placeholder="e.g., hackathon, pitch, sponsor"
            />
          </div>

          {/* Related URLs */}
          <div>
            <label className="text-xs font-medium text-[#6B6B6B] block mb-1">Related URLs (comma separated)</label>
            <input
              type="text"
              value={editUrls}
              onChange={(e) => setEditUrls(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-white border border-[#E5DFC8] rounded-lg focus:outline-none focus:border-[#F5A623] text-[#1A1A1A]"
              placeholder="e.g., github.com/user/*, figma.com/*"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="text-xs font-medium text-[#6B6B6B] block mb-1">Deadline</label>
            <input
              type="date"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-white border border-[#E5DFC8] rounded-lg focus:outline-none focus:border-[#F5A623] text-[#1A1A1A]"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs font-medium text-[#6B6B6B] block mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map(color => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    editColor === color ? 'ring-2 ring-offset-2 ring-[#F5A623] scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="flex-1 h-9 bg-[#F5A623] text-white text-sm font-medium rounded-lg hover:bg-[#E09510] disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 h-9 border border-[#E5DFC8] text-[#6B6B6B] text-sm font-medium rounded-lg hover:bg-[#FFF8E7] flex items-center justify-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // DELETE CONFIRMATION
  if (showDeleteConfirm) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border-2 border-[#E57373] rounded-xl p-4 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-3xl mb-2">🗑️</div>
          <p className="text-sm font-medium text-[#1A1A1A] mb-1">Delete "{project.name}"?</p>
          <p className="text-xs text-[#6B6B6B] mb-3">
            Resources will be unassigned but not deleted.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 h-9 bg-[#E57373] text-white text-sm font-medium rounded-lg hover:bg-[#EF5350] disabled:opacity-50 flex items-center justify-center"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Delete'
              )}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 h-9 border border-[#E5DFC8] text-[#6B6B6B] text-sm font-medium rounded-lg hover:bg-[#FFF8E7]"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // NORMAL VIEW
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className="bg-white border border-[#F0EBD8] rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all group"
      style={{ borderLeftWidth: '4px', borderLeftColor: projectColor }}
      onClick={onClick}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#1A1A1A] truncate">
            {project.name || 'Untitled Project'}
          </h3>
        </div>
        
        {/* Action Icons — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              try {
                setEditName(project.name || '');
                setEditKeywords((project.keywords || []).join(', '));
                setEditUrls((project.relatedUrls || []).join(', '));
                
                // Safe date parsing
                let dateStr = '';
                if (project.deadline) {
                  try {
                    const d = new Date(project.deadline);
                    if (!isNaN(d.getTime())) {
                      dateStr = d.toISOString().split('T')[0];
                    }
                  } catch (e) { console.warn('Invalid deadline:', project.deadline); }
                }
                setEditDeadline(dateStr);
                setEditColor(project.color || '#F5A623');
                setIsEditing(true);
              } catch (err) {
                console.error('Failed to open edit mode:', err);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-[#FFF8E7] text-[#9B9B9B] hover:text-[#F5A623] transition-colors"
            title="Edit project"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="p-1.5 rounded-lg hover:bg-[#FFEBEE] text-[#9B9B9B] hover:text-[#E57373] transition-colors"
            title="Delete project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Deadline */}
      {deadlineInfo && (
        <div 
          className="text-xs font-medium mb-2 inline-block px-2 py-0.5 rounded-full"
          style={{ 
            color: deadlineInfo.color, 
            backgroundColor: deadlineInfo.color === '#E57373' ? '#FFEBEE' : 
                           deadlineInfo.color === '#F5A623' ? '#FFF8E7' : '#E8F5E9'
          }}
        >
          ⏰ {deadlineInfo.text}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-[#9B9B9B] mb-2">
        <span>{resourceCount || 0} resource{(resourceCount || 0) !== 1 ? 's' : ''}</span>
        {unreadCount > 0 && (
          <span className="text-[#F5A623] font-medium">{unreadCount} unread</span>
        )}
      </div>

      {/* Progress Bar */}
      {resourceCount > 0 && (
        <div className="w-full h-1.5 bg-[#F0EBD8] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${progress}%`,
              backgroundColor: progress === 100 ? '#4CAF50' : projectColor
            }}
          />
        </div>
      )}

      {/* Keywords preview */}
      {project.keywords && project.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {project.keywords.slice(0, 3).map((keyword, i) => (
            <span 
              key={i}
              className="text-[10px] px-1.5 py-0.5 bg-[#FFF8E7] text-[#F5A623] rounded-full"
            >
              {keyword}
            </span>
          ))}
          {project.keywords.length > 3 && (
            <span className="text-[10px] text-[#9B9B9B]">
              +{project.keywords.length - 3} more
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

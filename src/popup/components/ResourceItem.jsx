import React from 'react';
import { Link as LinkIcon, FileText, Mic, ExternalLink, CheckCircle, Trash2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { deleteResource, updateResource } from '../../utils/storage.js';

export default function ResourceItem({ resource, project, onUpdate, onOpen }) {
  const Icon = resource.type === 'text' ? FileText : resource.type === 'voice' ? Mic : LinkIcon;

  const handleMarkRead = async (e) => {
    e.stopPropagation();
    await updateResource(resource.id, { readStatus: 'read' });
    onUpdate?.();
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm('Delete this resource?')) {
      await deleteResource(resource.id);
      onUpdate?.();
    }
  };

  const handleOpen = (e) => {
    if (e) e.stopPropagation();
    if (resource.url) window.open(resource.url, '_blank');
  };

  const handleCardClick = () => {
    if (onOpen) {
      onOpen(resource);
    } else {
      handleOpen();
    }
  };

  const timeAgo = new Date(resource.savedAt).toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white border border-[#F0EBD8] rounded-xl p-4 transition-all hover:shadow-md hover:border-[#F5A623]/30 flex items-start gap-4"
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: project?.color ? `${project.color}10` : '#FFF8E7', color: project?.color || '#F5A623' }}
      >
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={handleCardClick}>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-bold text-[#1A1A1A] truncate group-hover:text-[#F5A623] transition-colors leading-tight">
            {resource.title}
          </h4>
          {resource.readStatus === 'unread' && (
            <div className="w-2 h-2 rounded-full bg-[#F5A623] flex-shrink-0" />
          )}
        </div>

        {resource.summary && (
          <p className="text-xs text-[#6B6B6B] line-clamp-2 leading-relaxed mb-3">
            {resource.summary}
          </p>
        )}

        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold text-[#9B9B9B] uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {timeAgo}
          </span>
          
          {project && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="text-[#6B6B6B]">{project.name}</span>
            </div>
          )}

          {resource.deadlineMentioned && (
            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Clock size={10} />
              Due {new Date(resource.deadlineMentioned).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); handleOpen(); }}
          className="p-2 text-[#9B9B9B] hover:text-[#F5A623] hover:bg-[#FFF8E7] rounded-lg transition-all"
          title="Open Link"
        >
          <ExternalLink size={16} />
        </button>
        <button 
          onClick={handleMarkRead}
          className="p-2 text-[#9B9B9B] hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
          title="Mark as Read"
        >
          <CheckCircle size={16} />
        </button>
        <button 
          onClick={handleDelete}
          className="p-2 text-[#9B9B9B] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

import React from 'react';
import { ChevronRight, Clock, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectCard({ project, resources, onClick }) {
  const readCount = resources.filter(r => r.readStatus === 'read').length;
  const totalCount = resources.length;
  const progress = totalCount > 0 ? (readCount / totalCount) * 100 : 0;

  const getDeadlineStatus = () => {
    if (!project.deadline) return null;
    const now = new Date();
    const deadline = new Date(project.deadline);
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', color: 'text-red-500 bg-red-50' };
    if (diffDays === 0) return { label: 'Due Today', color: 'text-amber-600 bg-amber-50 animate-pulse-soft' };
    if (diffDays <= 3) return { label: `${diffDays}d left`, color: 'text-amber-600 bg-amber-50' };
    return { label: `${diffDays}d left`, color: 'text-[#6B6B6B] bg-[#F0EBD8]' };
  };

  const deadlineStatus = getDeadlineStatus();

  return (
    <motion.button
      whileHover={{ y: -4, shadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}
      onClick={onClick}
      className="text-left w-full bg-white border border-[#F0EBD8] rounded-2xl p-5 transition-all group relative overflow-hidden"
    >
      {/* Accent Line */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: project.color }}
      />

      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 mr-4">
          <h4 className="font-bold text-lg text-[#1A1A1A] group-hover:text-[#F5A623] transition-colors truncate">
            {project.name}
          </h4>
          <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider mt-1">
            {totalCount} {totalCount === 1 ? 'Resource' : 'Resources'}
          </p>
        </div>
        <div className="p-2 bg-[#FFFDF7] border border-[#F0EBD8] rounded-xl text-[#9B9B9B] group-hover:text-[#F5A623] group-hover:border-[#F5A623]/20 transition-all">
          <ChevronRight size={18} />
        </div>
      </div>

      <div className="space-y-4">
        {deadlineStatus && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${deadlineStatus.color}`}>
            <Clock size={12} />
            {deadlineStatus.label}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-[#6B6B6B]">Progress</span>
            <span className="text-[#1A1A1A]">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#F0EBD8] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full rounded-full"
              style={{ backgroundColor: project.color }}
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Clock, 
  Flame, 
  Filter, 
  SortAsc,
  Plus,
  Search as SearchIcon
} from 'lucide-react';
import ResourceItem from './ResourceItem.jsx';

export default function FocusMode({ project, resources, onBack, onUpdate, onOpen }) {
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [searchQuery, setSearchQuery] = useState('');

  const projectResources = useMemo(() => {
    return resources
      .filter(r => r.projectId === project.id)
      .filter(r => {
        if (filter === 'unread') return r.readStatus === 'unread';
        if (filter === 'read') return r.readStatus === 'read';
        return true;
      })
      .filter(r => 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.summary && r.summary.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }, [resources, project.id, filter, searchQuery]);

  const hotResources = useMemo(() => {
    return [...projectResources]
      .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
      .slice(0, 2);
  }, [projectResources]);

  const daysLeft = useMemo(() => {
    if (!project.deadline) return null;
    const diff = new Date(project.deadline) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [project.deadline]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[#9B9B9B] hover:text-[#1A1A1A] font-bold text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Projects</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
          <h2 className="text-2xl font-black text-[#1A1A1A] tracking-tight">{project.name}</h2>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {project.deadline && (
          <div className="bg-white border border-[#F0EBD8] rounded-2xl p-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 opacity-50" />
            <div className="relative">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Clock size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Time Remaining</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-black ${daysLeft <= 3 ? 'text-red-500' : 'text-[#1A1A1A]'}`}>
                  {daysLeft}
                </span>
                <span className="text-xl font-bold text-[#6B6B6B]">days</span>
              </div>
              <div className="mt-4 h-1.5 w-full bg-[#F0EBD8] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }} // Mock progress for visual
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-[#F0EBD8] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-orange-500 mb-4">
            <Flame size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Hot Resources</span>
          </div>
          <div className="space-y-3">
            {hotResources.length === 0 ? (
              <p className="text-xs text-[#9B9B9B] italic">No resources yet. Start saving!</p>
            ) : (
              hotResources.map(res => (
                <div key={res.id} className="flex items-center justify-between group cursor-pointer" onClick={() => window.open(res.url, '_blank')}>
                  <span className="text-sm font-bold text-[#1A1A1A] truncate max-w-[200px] group-hover:text-[#F5A623] transition-colors">{res.title}</span>
                  <span className="text-[10px] font-black text-[#9B9B9B] px-1.5 py-0.5 bg-[#FFFDF7] border border-[#F0EBD8] rounded">
                    {res.accessCount || 0} visits
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Resource Management */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-1 bg-[#F0EBD8] p-1 rounded-xl">
            {['all', 'unread', 'read'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-white text-[#F5A623] shadow-sm' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9B9B]" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in project..."
              className="w-full bg-white border border-[#F0EBD8] rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-[#F5A623] transition-colors"
            />
          </div>
        </div>

        <div className="space-y-4 min-h-[200px]">
          <AnimatePresence mode="popLayout">
            {projectResources.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center"
              >
                <div className="w-16 h-16 bg-[#FFF8E7] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="text-[#F5A623]" size={24} />
                </div>
                <h3 className="text-[#1A1A1A] font-bold">No matching resources</h3>
                <p className="text-xs text-[#9B9B9B] mt-1">Try adjusting your filters or search query</p>
              </motion.div>
            ) : (
              projectResources.map(res => (
                <ResourceItem 
                  key={res.id} 
                  resource={res} 
                  project={project}
                  onUpdate={onUpdate}
                  onOpen={onOpen}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

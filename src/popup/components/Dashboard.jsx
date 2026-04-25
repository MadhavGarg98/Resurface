import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, Zap } from 'lucide-react';
import { getProjects, getResources, saveProject, updateResource, deleteResource } from '../../utils/storage.js';
import { smartSearch } from '../../utils/smartSearch.js';
import ProjectCard from './ProjectCard.jsx';
import ResourceItem from './ResourceItem.jsx';
import SearchBar from './SearchBar.jsx';
import CreateProjectModal from './CreateProjectModal.jsx';
import StatsChart from './StatsChart.jsx';

export default function Dashboard({ onProjectClick, onOpenResource }) {
  const [projects, setProjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [p, r] = await Promise.all([getProjects(), getResources()]);
    setProjects(p);
    setResources(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async (newProject) => {
    await saveProject(newProject);
    await loadData();
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const results = await smartSearch(query, resources);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleMarkRead = async (id) => {
    await updateResource(id, { readStatus: 'read' });
    await loadData();
  };

  const handleDeleteResource = async (id) => {
    await deleteResource(id);
    await loadData();
  };

  const recentResources = [...resources]
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .slice(0, 5);

  const sortedProjects = [...projects].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400 font-medium">Resurfacing...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-500 fill-blue-500" /> Resurface
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
            {resources.length} resources &middot; {projects.length} projects
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <SearchBar onSearch={handleSearch} />

      <AnimatePresence mode="wait">
        {searchResults ? (
          <motion.div 
            key="search-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Search Results</h2>
              {searchResults.usedAI && (
                <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase">AI Enhanced</span>
              )}
            </div>
            <div className="space-y-3">
              {searchResults.results.map(r => (
                <ResourceItem 
                  key={r.id} 
                  resource={r} 
                  project={projects.find(p => p.id === r.projectId)}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDeleteResource}
                  onOpen={onOpenResource}
                />
              ))}
              {searchResults.results.length === 0 && (
                <div className="text-center py-10 text-slate-500 italic text-sm">No results found.</div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="main-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <section>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" /> Your Projects
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {sortedProjects.map(p => (
                  <ProjectCard 
                    key={p.id} 
                    project={p} 
                    resourceCount={resources.filter(r => r.projectId === p.id).length}
                    unreadCount={resources.filter(r => r.projectId === p.id && r.readStatus === 'unread').length}
                    onClick={() => onProjectClick(p)}
                  />
                ))}
                {projects.length === 0 && (
                  <div className="p-8 text-center bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl">
                    <p className="text-slate-400 text-sm font-medium mb-3">Organize your saves into projects.</p>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="text-blue-400 text-sm font-bold hover:text-blue-300"
                    >
                      Create your first project →
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Recently Saved</h2>
              <div className="space-y-3">
                {recentResources.map(r => (
                  <ResourceItem 
                    key={r.id} 
                    resource={r} 
                    project={projects.find(p => p.id === r.projectId)}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDeleteResource}
                    onOpen={onOpenResource}
                  />
                ))}
                {resources.length === 0 && (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Your world is full of things to remember.</p>
                    <p className="text-slate-500 text-xs mt-2">Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Ctrl+Shift+S</kbd> to save anything.</p>
                  </div>
                )}
              </div>
            </section>

            {projects.length > 0 && <StatsChart projects={projects} resources={resources} />}
          </motion.div>
        )}
      </AnimatePresence>

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleCreateProject}
      />
    </div>
  );
}

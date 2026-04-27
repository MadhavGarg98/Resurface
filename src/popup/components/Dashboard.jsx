import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, Zap, ChevronRight } from 'lucide-react';
import { getProjects, getResources, saveProject, updateResource, deleteResource, deleteProject, updateProject } from '../../utils/storage.js';
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
  const [editingProject, setEditingProject] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const loadData = useCallback(async () => {
    console.log('[Dashboard] Loading data...');
    setLoading(true);
    const [p, r] = await Promise.all([getProjects(), getResources()]);
    console.log('[Dashboard] Projects loaded:', p.length, p);
    console.log('[Dashboard] Resources loaded:', r.length, r);
    setProjects(p);
    setResources(r);
    setLoading(false);
    console.log('[Dashboard] State updated');
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async (projectData) => {
    await saveProject(projectData);
    setEditingProject(null);
    await loadData();
  };

  const handleDeleteProject = async (projectId) => {
    console.log('[DASHBOARD] handleDeleteProject called with:', projectId);
    
    try {
      console.log('[DASHBOARD] Calling deleteProject from storage...');
      await deleteProject(projectId);
      console.log('[DASHBOARD] deleteProject completed successfully');
      
      // Reload data
      console.log('[DASHBOARD] Reloading data...');
      const updatedProjects = await getProjects();
      const updatedResources = await getResources();
      
      console.log('[DASHBOARD] Updated projects:', updatedProjects.length);
      console.log('[DASHBOARD] Updated resources:', updatedResources.length);
      
      // Update state
      setProjects(updatedProjects);
      setResources(updatedResources);
      
      console.log('[DASHBOARD] State updated - project should be gone');
      
    } catch (error) {
      console.error('[DASHBOARD] Delete failed:', error);
      console.error('[DASHBOARD] Error name:', error.name);
      console.error('[DASHBOARD] Error message:', error.message);
      throw error; // Let the ProjectCard catch this and show error
    }
  };

  const handleUpdateProject = async (projectId, updates) => {
    console.log('[Dashboard] Updating project:', projectId, updates);
    await updateProject(projectId, updates);
    await loadData();
    console.log('[Dashboard] Project updated, data refreshed');
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
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <img 
              src={typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/favicon.png') : '/icons/favicon.png'} 
              className="w-8 h-8 object-contain" 
              alt="" 
            /> Resurface
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
            {resources.length} resources &middot; {projects.length} projects
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingProject(null);
            setIsModalOpen(true);
          }}
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
                  onUpdate={loadData}
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
                {sortedProjects.map(p => {
                  const projectResources = resources.filter(r => r.projectId === p.id);
                  const unreadCount = projectResources.filter(r => r.readStatus === 'unread').length;
                  
                  return (
                    <ProjectCard 
                      key={p.id} 
                      project={p} 
                      resourceCount={projectResources.length}
                      unreadCount={unreadCount}
                      onClick={() => onProjectClick(p)}
                      onDelete={async (projectId) => {
                        console.log('[DASHBOARD] Delete handler called for:', projectId);
                        try {
                          await deleteProject(projectId);
                          const freshProjects = await getProjects();
                          const freshResources = await getResources();
                          setProjects(freshProjects);
                          setResources(freshResources);
                        } catch (error) {
                          console.error('Delete failed:', error);
                          throw error;
                        }
                      }}
                      onUpdate={async (projectId, updates) => {
                        console.log('[DASHBOARD] Update handler called for:', projectId, updates);
                        try {
                          await updateProject(projectId, updates);
                          const freshProjects = await getProjects();
                          const freshResources = await getResources();
                          setProjects(freshProjects);
                          setResources(freshResources);
                        } catch (error) {
                          console.error('Update failed:', error);
                          throw error;
                        }
                      }}
                    />
                  );
                })}
                {projects.length === 0 && (
                  <div className="p-8 text-center bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl">
                    <p className="text-slate-400 text-sm font-medium mb-3">Organize your saves into projects.</p>
                    <button 
                      onClick={() => {
                        setEditingProject(null);
                        setIsModalOpen(true);
                      }}
                      className="text-blue-400 text-sm font-bold hover:text-blue-300"
                    >
                      <span className="flex items-center justify-center gap-1">
                        Create your first project <ChevronRight size={14} />
                      </span>
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
                    onUpdate={loadData}
                    onOpen={onOpenResource}
                  />
                ))}
                {resources.length === 0 && (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <img 
                        src={typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/favicon.png') : '/icons/favicon.png'} 
                        className="w-8 h-8 object-contain" 
                        alt="" 
                      />
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
        initialData={editingProject}
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, 
  Package, 
  Folder, 
  Clock, 
  Plus, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { getResources, getProjects, saveProject, deleteProject, updateProject, updateResource } from '../../utils/storage.js';
import SearchBar from './SearchBar.jsx';
import ProjectCard from './ProjectCard.jsx';
import ResourceItem from './ResourceItem.jsx';
import FocusMode from './FocusMode.jsx';
import CreateProjectModal from './CreateProjectModal.jsx';
import Settings from './Settings.jsx';
import StatsChart from './StatsChart.jsx';
import ResourceDetailModal from './ResourceDetailModal.jsx';
import ClassificationConfirm from './ClassificationConfirm.jsx';

export default function FullDashboard() {
  const [view, setView] = useState('overview'); // overview, settings
  const [resources, setResources] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingClassification, setPendingClassification] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [p, r] = await Promise.all([getProjects(), getResources()]);
    setProjects(p);
    setResources(r);
    
    // Also check for pending classification
    const result = await chrome.storage.local.get(['_pendingClassification']);
    if (result._pendingClassification) {
      setPendingClassification(result._pendingClassification);
    }
    
    setLoading(false);
  }, []);

  const handleConfirmClassification = async (projectId, tags) => {
    if (!pendingClassification) return;
    
    const { resource } = pendingClassification;
    let resourceId = resource.id;
    
    // Fallback for resources saved before the fix
    if (!resourceId) {
      const all = await getResources();
      const match = all.find(r => r.url === resource.url && r.title === resource.title);
      if (match) resourceId = match.id;
    }
    
    if (resourceId) {
      await updateResource(resourceId, { 
        projectId, 
        tags: [...new Set([...(resource.tags || []), ...(tags || [])])],
        _needsConfirmation: false,
        _pendingClassification: null
      });
    }
    
    await chrome.storage.local.remove(['_pendingClassification']);
    setPendingClassification(null);
    await loadData();
  };

  const handleDismissClassification = async () => {
    if (!pendingClassification) return;
    
    const { resource } = pendingClassification;
    let resourceId = resource.id;
    
    if (!resourceId) {
      const all = await getResources();
      const match = all.find(r => r.url === resource.url && r.title === resource.title);
      if (match) resourceId = match.id;
    }
    
    if (resourceId) {
      await updateResource(resourceId, { 
        _needsConfirmation: false,
        _pendingClassification: null
      });
    }
    
    await chrome.storage.local.remove(['_pendingClassification']);
    setPendingClassification(null);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async (newProject) => {
    await saveProject(newProject);
    await loadData();
  };

  const timeSaved = Math.round(resources.length * 3.5); // Mock metric: 3.5 mins per resource

  if (loading) return (
    <div className="min-h-screen bg-[#FFFDF7] flex items-center justify-center">
      <img 
        src={typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/favicon.png') : '/icons/favicon.png'} 
        className="w-12 h-12 object-contain animate-pulse" 
        alt="Loading..." 
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFDF7] font-sans selection:bg-[#FFF8E7]">
      {/* Top Nav */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#F0EBD8] z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/favicon.png') : '/icons/favicon.png'} 
            className="w-8 h-8 object-contain" 
            alt="Resurface Logo" 
          />
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Resurface</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView(view === 'settings' ? 'overview' : 'settings')}
            className={`p-2 rounded-xl transition-all ${view === 'settings' ? 'bg-[#FFF8E7] text-[#F5A623]' : 'text-[#9B9B9B] hover:text-[#1A1A1A] hover:bg-[#F0EBD8]'}`}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2">Settings</h2>
                <p className="text-[#6B6B6B]">Configure your AI providers and extension behavior.</p>
              </div>
              <div className="max-w-2xl">
                <Settings />
              </div>
            </motion.div>
          ) : activeProject ? (
            <motion.div
              key="focus"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <FocusMode 
                project={activeProject} 
                resources={resources}
                onBack={() => setActiveProject(null)}
                onUpdate={loadData}
                onOpen={(r) => setSelectedResource(r)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              <AnimatePresence>
                {pendingClassification && (
                  <div className="mb-10">
                    <ClassificationConfirm
                      classification={pendingClassification.classification}
                      resource={pendingClassification.resource}
                      onConfirm={handleConfirmClassification}
                      onDismiss={handleDismissClassification}
                    />
                  </div>
                )}
              </AnimatePresence>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-[#F0EBD8] p-6 rounded-2xl shadow-sm flex items-center gap-5">
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#1A1A1A]">{resources.length}</div>
                    <div className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Resources</div>
                  </div>
                </div>
                <div className="bg-white border border-[#F0EBD8] p-6 rounded-2xl shadow-sm flex items-center gap-5">
                  <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
                    <Folder size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#1A1A1A]">{projects.length}</div>
                    <div className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Projects</div>
                  </div>
                </div>
                <div className="bg-white border border-[#F0EBD8] p-6 rounded-2xl shadow-sm flex items-center gap-5">
                  <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                    <Clock size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#1A1A1A]">{timeSaved}h</div>
                    <div className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Time Saved</div>
                  </div>
                </div>
              </div>

              {/* Search Section */}
              <div className="bg-white border border-[#F0EBD8] p-2 rounded-2xl shadow-sm">
                <SearchBar 
                  isFullPage={true} 
                  onResultClick={(r) => setSelectedResource(r)} 
                />
              </div>

              {/* Projects Grid */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#1A1A1A]">Your Projects</h3>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 text-[#F5A623] font-bold text-sm hover:text-[#E09512] transition-colors px-3 py-1.5 border-2 border-[#F5A623] rounded-xl hover:bg-[#FFF8E7]"
                  >
                    <Plus size={16} />
                    <span>New Project</span>
                  </button>
                </div>
                
                {projects.length === 0 ? (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-12 border-2 border-dashed border-[#F0EBD8] rounded-2xl text-[#9B9B9B] hover:border-[#F5A623] hover:text-[#F5A623] hover:bg-[#FFF8E7] transition-all group"
                  >
                    <Plus size={32} className="mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-bold">Create your first project to organize your knowledge</p>
                  </button>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => {
                      const projectResources = resources.filter(r => r.projectId === p.id);
                      const unreadCount = projectResources.filter(r => r.readStatus === 'unread').length;
                      
                      return (
                        <ProjectCard 
                          key={p.id} 
                          project={p} 
                          resourceCount={projectResources.length}
                          unreadCount={unreadCount}
                          onDelete={async (projectId) => {
                            console.log('[DASHBOARD] Delete called for:', projectId);
                            await deleteProject(projectId);
                            await loadData();
                          }}
                          onUpdate={async (projectId, updates) => {
                            console.log('[DASHBOARD] Update called for:', projectId);
                            await updateProject(projectId, updates);
                            await loadData();
                          }}
                          onClick={() => setActiveProject(p)}
                        />
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Recent Resources */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#1A1A1A]">Recently Saved</h3>
                  <div className="flex items-center gap-1 text-xs font-bold text-[#9B9B9B] hover:text-[#F5A623] cursor-pointer group">
                    <span>See All</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  {resources.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).slice(0, 8).map(res => (
                    <ResourceItem 
                      key={res.id} 
                      resource={res} 
                      project={projects.find(p => p.id === res.projectId)}
                      onUpdate={loadData}
                      onOpen={(r) => setSelectedResource(r)}
                    />
                  ))}
                </div>
              </section>

              {/* Stats Visualization */}
              <section className="bg-white border border-[#F0EBD8] p-8 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <TrendingUp className="text-[#F5A623]" size={20} />
                  <h3 className="text-xl font-bold text-[#1A1A1A]">Knowledge Growth</h3>
                </div>
                <div className="h-[300px]">
                  <StatsChart projects={projects} resources={resources} />
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleCreateProject}
      />

      <ResourceDetailModal 
        resource={selectedResource}
        project={projects.find(p => p.id === selectedResource?.projectId)}
        isOpen={!!selectedResource}
        onClose={() => setSelectedResource(null)}
        onUpdate={loadData}
      />
    </div>
  );
}

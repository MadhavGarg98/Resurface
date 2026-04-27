import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, 
  Package, 
  Folder, 
  Clock, 
  Plus, 
  ChevronRight,
  TrendingUp,
  Layers
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
import FloatingNavBar from './FloatingNavBar.jsx';

export default function FullDashboard() {
  const [view, setView] = useState('overview'); // overview, settings, projects, library
  const [resources, setResources] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingClassification, setPendingClassification] = useState(null);

  const timeSaved = Math.round((resources.length * 5) / 60);

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

  const scrollToProjects = () => {
    setView('overview');
    setActiveProject(null);
    setTimeout(() => {
      const element = document.getElementById('projects-grid');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <img 
        src={typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/favicon.png') : '/icons/favicon.png'} 
        className="w-12 h-12 object-contain animate-pulse" 
        alt="Loading..." 
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] font-sans selection:bg-[#C49A6C]/20">
      {/* Top Nav */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-[#E8E2D6] z-50 px-8 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => {
            setView('overview');
            setActiveProject(null);
          }}
        >
          <img 
            src={typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/favicon.png') : '/icons/favicon.png'} 
            className="w-10 h-10 object-contain transition-transform group-hover:scale-110" 
            alt="Resurface Logo" 
          />
          <h1 className="text-3xl font-black text-[#3D3832] tracking-tighter group-hover:text-[#C49A6C] transition-colors">Resurface</h1>
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
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-[#3D3832] mb-2">Settings</h2>
                  <p className="text-[#A8A29E]">Configure your AI providers and extension behavior.</p>
                </div>
                <button 
                  onClick={() => setView('overview')}
                  className="px-4 py-2 bg-white border border-[#E8E2D6] rounded-xl text-sm font-bold text-[#3D3832] hover:bg-[#FAF8F5] transition-colors flex items-center gap-2"
                >
                  <ChevronRight size={16} className="rotate-180" />
                  Back to Dashboard
                </button>
              </div>
              <div className="max-w-2xl">
                <Settings />
              </div>
            </motion.div>
          ) : view === 'library' ? (
            <motion.div
              key="library-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-bold text-[#3D3832] mb-2">Library</h2>
                  <p className="text-[#A8A29E]">Browse and manage all your saved resources in one place.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('overview')}
                    className="px-4 py-2 bg-white border border-[#E8E2D6] rounded-xl text-sm font-bold text-[#3D3832] hover:bg-[#FAF8F5] transition-colors flex items-center gap-2"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                    Back to Dashboard
                  </button>
                </div>
              </div>

              {/* Library Search */}
              <div className="mb-8 bg-white border border-[#E8E2D6] p-1.5 rounded-2xl shadow-sm">
                <SearchBar 
                  isFullPage={true} 
                  onResultClick={(r) => setSelectedResource(r)} 
                />
              </div>
              
              <div className="space-y-4">
                {resources.length === 0 ? (
                  <div className="text-center py-20 bg-white border border-dashed border-[#E8E2D6] rounded-2xl">
                    <Layers size={48} className="mx-auto text-[#E8E2D6] mb-4" />
                    <p className="text-[#A8A29E] font-medium">Your library is empty. Save some resources to get started!</p>
                  </div>
                ) : (
                  resources.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).map(res => (
                    <ResourceItem 
                      key={res.id} 
                      resource={res} 
                      project={projects.find(p => p.id === res.projectId)}
                      onUpdate={loadData}
                      onOpen={(r) => setSelectedResource(r)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          ) : view === 'projects' ? (
            <motion.div
              key="projects-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-[#3D3832] mb-2">Projects</h2>
                  <p className="text-[#A8A29E]">Organize your resources into focused knowledge hubs.</p>
                </div>
                <button 
                  onClick={() => setView('overview')}
                  className="px-4 py-2 bg-white border border-[#E8E2D6] rounded-xl text-sm font-bold text-[#3D3832] hover:bg-[#FAF8F5] transition-colors flex items-center gap-2"
                >
                  <ChevronRight size={16} className="rotate-180" />
                  Back to Dashboard
                </button>
              </div>
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
                        await deleteProject(projectId);
                        await loadData();
                      }}
                      onUpdate={async (projectId, updates) => {
                        await updateProject(projectId, updates);
                        await loadData();
                      }}
                      onClick={() => {
                        setActiveProject(p);
                        setView('overview');
                      }}
                    />
                  );
                })}
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="h-full min-h-[160px] border-2 border-dashed border-[#E8E2D6] rounded-2xl text-[#A8A29E] hover:border-[#C49A6C] hover:text-[#C49A6C] hover:bg-[#FAF8F5] transition-all group flex flex-col items-center justify-center p-6"
                >
                  <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-sm">New Project</p>
                </button>
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
                <div className="bg-white border border-[#E8E2D6] p-6 rounded-2xl shadow-sm flex items-center gap-5">
                  <div className="w-12 h-12 bg-[#FAF8F5] text-[#C49A6C] rounded-xl flex items-center justify-center border border-[#E8E2D6]/50">
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#3D3832]">{resources.length}</div>
                    <div className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider">Resources</div>
                  </div>
                </div>
                <div className="bg-white border border-[#E8E2D6] p-6 rounded-2xl shadow-sm flex items-center gap-5">
                  <div className="w-12 h-12 bg-[#FAF8F5] text-[#C49A6C] rounded-xl flex items-center justify-center border border-[#E8E2D6]/50">
                    <Folder size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#3D3832]">{projects.length}</div>
                    <div className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider">Projects</div>
                  </div>
                </div>
                <div className="bg-white border border-[#E8E2D6] p-6 rounded-2xl shadow-sm flex items-center gap-5">
                  <div className="w-12 h-12 bg-[#FAF8F5] text-[#C49A6C] rounded-xl flex items-center justify-center border border-[#E8E2D6]/50">
                    <Clock size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#3D3832]">{timeSaved}h</div>
                    <div className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider">Time Saved</div>
                  </div>
                </div>
              </div>

              {/* Search Section */}
              <div className="bg-white border border-[#E8E2D6] p-1.5 rounded-2xl shadow-sm">
                <SearchBar 
                  isFullPage={true} 
                  onResultClick={(r) => setSelectedResource(r)} 
                />
              </div>

              {/* Projects Grid */}
              <section id="projects-grid">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#3D3832]">Your Projects</h3>
                </div>
                
                {projects.length === 0 ? (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-12 border-2 border-dashed border-[#E8E2D6] rounded-2xl text-[#A8A29E] hover:border-[#C49A6C] hover:text-[#C49A6C] hover:bg-[#FAF8F5] transition-all group"
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
                            await deleteProject(projectId);
                            await loadData();
                          }}
                          onUpdate={async (projectId, updates) => {
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
                  <h3 className="text-xl font-bold text-[#3D3832]">Recently Saved</h3>
                  <div 
                    onClick={() => setView('library')}
                    className="flex items-center gap-1 text-xs font-bold text-[#A8A29E] hover:text-[#C49A6C] cursor-pointer group"
                  >
                    <span>See All</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  {resources.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).slice(0, 5).map(res => (
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
              <section className="bg-white border border-[#E8E2D6] p-8 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <TrendingUp className="text-[#C49A6C]" size={20} />
                  <h3 className="text-xl font-bold text-[#3D3832]">Knowledge Growth</h3>
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

      <FloatingNavBar 
        currentView={view === 'settings' ? 'settings' : (view === 'projects' ? 'projects' : (view === 'library' ? 'library' : (activeProject ? '' : 'dashboard')))} 
        setView={(v) => {
          setView(v === 'overview' ? 'overview' : v);
          setActiveProject(null);
        }} 
        onNewProject={() => setIsModalOpen(true)} 
      />
    </div>
  );
}

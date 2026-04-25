import React, { useState, useEffect } from 'react';
import { Link, FileText, Mic, Clock } from 'lucide-react';
import { getResources, getProjects } from '../../utils/storage.js';

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function RecentResourcesList({ onSelect }) {
  const [resources, setResources] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    async function loadData() {
      const [r, p] = await Promise.all([getResources(), getProjects()]);
      setResources(r.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).slice(0, 3));
      setProjects(p);
    }
    loadData();
  }, []);

  const handleOpen = (url) => {
    if (url) chrome.tabs.create({ url });
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-6 text-[#9B9B9B] text-xs">
        <p>Press <kbd className="px-1 py-0.5 bg-[#F0EBD8] rounded">Ctrl+Shift+S</kbd> to save something</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resources.map((res) => {
        const Icon = res.type === 'text' ? FileText : res.type === 'voice' ? Mic : Link;
        const project = projects.find(p => p.id === res.projectId);
        
        return (
          <button
            key={res.id}
            onClick={() => onSelect ? onSelect(res) : handleOpen(res.url)}
            className="w-full text-left bg-white border border-[#F0EBD8] p-3 rounded-xl hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-[#6B6B6B] group-hover:text-[#F5A623] transition-colors">
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-[#1A1A1A] truncate group-hover:text-[#F5A623] transition-colors">
                  {res.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-[#9B9B9B]">
                  <span>{formatTimeAgo(res.savedAt)}</span>
                  {project && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                        <span className="truncate max-w-[80px]">{project.name}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

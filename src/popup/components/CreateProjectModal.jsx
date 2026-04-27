import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layout, Plus, Check, Save } from 'lucide-react';

const COLORS = [
  '#C49A6C', // Brand Gold
  '#A8A29E', // Muted Gray
  '#E57373', // Red
  '#F06292', // Pink
  '#BA68C8', // Purple
  '#7986CB', // Indigo
  '#64B5F6', // Blue
  '#4DB6AC', // Teal
  '#81C784', // Green
  '#AED581', // Light Green
  '#DCE775', // Lime
  '#FFF176', // Yellow
  '#FFD54F', // Amber
  '#FFB74D', // Orange
  '#FF8A65', // Deep Orange
  '#A1887F', // Brown
  '#90A4AE', // Blue Gray
  '#4FC3F7', // Sky Blue
  '#4DB6AC', // Cyan
  '#CE93D8', // Light Purple
];

export default function CreateProjectModal({ isOpen, onClose, onSave, initialData = null }) {
  const [formData, setFormData] = useState({
    name: '',
    keywords: '',
    urls: '',
    deadline: '',
    color: COLORS[0]
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        keywords: (initialData.keywords || []).join(', '),
        urls: (initialData.relatedUrls || []).join(', '),
        deadline: initialData.deadline || '',
        color: initialData.color || COLORS[0]
      });
    } else {
      setFormData({ name: '', keywords: '', urls: '', deadline: '', color: COLORS[0] });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    onSave({
      ...(initialData || {}),
      ...formData,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
      relatedUrls: formData.urls.split(',').map(u => u.trim()).filter(u => u),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#3D3832]/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl shadow-2xl border border-[#E8E2D6] overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#E8E2D6] text-[#C49A6C] rounded-xl">
                    <Layout size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-[#3D3832] tracking-tight">
                    {initialData ? 'Edit Project' : 'New Project'}
                  </h2>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-[#A8A29E] hover:text-[#3D3832] hover:bg-[#E8E2D6]/50 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">Project Name</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., HackIndia 2024"
                    className="w-full bg-white border border-[#E8E2D6] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C49A6C] transition-colors text-[#3D3832]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">AI Keywords</label>
                    <input
                      type="text"
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      placeholder="react, web3,..."
                      className="w-full bg-white border border-[#E8E2D6] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C49A6C] transition-colors text-[#3D3832]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">Deadline</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full bg-white border border-[#E8E2D6] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C49A6C] transition-colors text-[#3D3832]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">Related URLs (Comma separated)</label>
                  <input
                    type="text"
                    value={formData.urls}
                    onChange={(e) => setFormData({ ...formData, urls: e.target.value })}
                    placeholder="wikipedia.org, github.com/*, docs.google.com"
                    className="w-full bg-white border border-[#E8E2D6] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C49A6C] transition-colors text-[#3D3832]"
                  />
                  <p className="text-[10px] text-[#A8A29E]">The sidebar will appear proactively on these sites.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">Project Theme</label>
                  <div className="flex flex-wrap gap-3">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${formData.color === color ? 'ring-2 ring-offset-2 ring-[#C49A6C] scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      >
                        {formData.color === color && <Check size={14} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-4 border-2 border-[#E8E2D6] text-[#A8A29E] font-bold rounded-2xl hover:bg-white hover:border-[#C49A6C] hover:text-[#C49A6C] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-[#C49A6C] hover:bg-[#B5895B] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[#C49A6C]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {initialData ? <Save size={20} /> : <Plus size={20} />}
                    <span>{initialData ? 'Save Changes' : 'Create Project'}</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

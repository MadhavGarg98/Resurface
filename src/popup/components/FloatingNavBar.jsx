import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Compass,
  LayoutGrid,
  Folder,
  Plus,
  Layers
} from 'lucide-react';

export default function FloatingNavBar({ currentView, setView, onNewProject }) {
  // Default to open as requested
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { 
      id: 'dashboard', 
      icon: <LayoutGrid size={22} />, 
      label: 'Dashboard', 
      onClick: () => { setView('overview'); setIsOpen(false); } 
    },
    { 
      id: 'projects', 
      icon: <Folder size={22} />, 
      label: 'Projects', 
      onClick: () => { setView('projects'); setIsOpen(false); } 
    },
    { 
      id: 'settings', 
      icon: <SettingsIcon size={22} />, 
      label: 'Settings', 
      onClick: () => { setView('settings'); setIsOpen(false); } 
    },
    { 
      id: 'library', 
      icon: <Layers size={22} />, 
      label: 'Library', 
      onClick: () => { setView('library'); setIsOpen(false); } 
    },
    { 
      id: 'new-project', 
      icon: <Plus size={22} />, 
      label: 'New Project', 
      onClick: () => { onNewProject(); setIsOpen(false); } 
    }
  ];

  return (
    <nav className="fixed top-[30%] right-8 z-[100] flex flex-col items-center">
      {/* Compass Trigger */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-[56px] h-[56px] bg-[#3D3832] text-white rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(61,56,50,0.3)] cursor-pointer mb-4 border-2 border-[#C49A6C]/30 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-[#C49A6C]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-75" />
        <Compass size={32} className={isOpen ? 'text-[#C49A6C]' : 'text-white'} />
      </motion.button>

      {/* Expanded Items */}
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {isOpen && menuItems.map((item, index) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, scale: 0.3, y: -40 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                transition: {
                  type: "spring",
                  stiffness: 400,
                  damping: 20,
                  delay: index * 0.08
                }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.5, 
                y: -20,
                transition: { duration: 0.2, delay: (menuItems.length - index) * 0.05 }
              }}
              className="flex items-center group relative"
            >
              {/* Tooltip (premium brand theme) */}
              <div className="absolute right-full mr-6 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-x-2 group-hover:translate-x-0">
                <div className="bg-[#3D3832] text-[#FAF8F5] text-[12px] font-extrabold px-4 py-2 rounded-xl shadow-2xl whitespace-nowrap border border-[#C49A6C]/30">
                  {item.label}
                  <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-[#3D3832] rotate-45 border-r border-t border-[#C49A6C]/30" />
                </div>
              </div>

              {/* Icon Circle */}
              <motion.button
                whileHover={{ 
                  scale: 1.15, 
                  backgroundColor: '#C49A6C',
                  color: '#FAF8F5',
                  boxShadow: '0 12px 24px rgba(196, 154, 108, 0.4)'
                }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.1 }}
                onClick={item.onClick}
                className={`w-[56px] h-[56px] rounded-full flex items-center justify-center shadow-xl border-2 ${
                  currentView === item.id 
                    ? 'bg-[#C49A6C] text-[#FAF8F5] border-[#C49A6C]' 
                    : 'bg-[#FFFFFF] text-[#3D3832] border-[#E8E2D6]'
                }`}
              >
                {item.icon}
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </nav>
  );
}

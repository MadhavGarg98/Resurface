import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { performSmartSearch } from '../../utils/smartSearch.js';

export default function SearchBar({ isFullPage, onResultClick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAISearch, setIsAISearch] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setIsAISearch(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      // Logic for AI search detection
      const aiWords = ['what', 'how', 'why', 'who', 'when', 'tell', 'explain', '?'];
      const needsAI = aiWords.some(word => query.toLowerCase().includes(word));
      setIsAISearch(needsAI);

      const searchResults = await performSmartSearch(query);
      setResults(searchResults);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <div className={`relative flex items-center group ${isFullPage ? '' : 'max-w-md mx-auto'}`}>
        <div className={`absolute left-4 transition-colors ${isSearching ? 'text-[#F5A623]' : 'text-[#9B9B9B]'}`}>
          {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isFullPage ? "Search your saved resources... try 'what was that API article?'" : "Search resources..."}
          className={`w-full bg-transparent border-none py-4 pl-12 pr-24 text-base focus:outline-none placeholder:text-[#9B9B9B] font-medium text-[#1A1A1A]`}
        />

        <div className="absolute right-4 flex items-center gap-2">
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 text-[#9B9B9B] hover:text-[#1A1A1A] transition-colors"
            >
              <X size={18} />
            </button>
          )}
          <AnimatePresence>
            {isAISearch && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-[#FFF8E7] text-[#F5A623] px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 border border-[#F5A623]/20 shadow-sm"
              >
                <Sparkles size={10} className="fill-current" />
                AI
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute top-full left-0 right-0 mt-2 bg-white border border-[#F0EBD8] rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto ${isFullPage ? '' : 'max-w-md mx-auto'}`}
          >
            {results.length === 0 ? (
              <div className="p-8 text-center text-[#9B9B9B]">
                <p className="text-sm">No matches found for "{query}"</p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => {
                      onResultClick(res);
                      setQuery('');
                    }}
                    className="w-full text-left p-4 hover:bg-[#FFF8E7] transition-colors flex items-start gap-3 border-b border-[#F0EBD8] last:border-0"
                  >
                    <div className="mt-1 text-[#F5A623]">
                      <Sparkles size={14} className={res.score > 0.8 ? 'fill-current' : ''} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-[#1A1A1A] truncate">{res.title}</h5>
                      {res.summary && <p className="text-xs text-[#6B6B6B] line-clamp-1 mt-0.5">{res.summary}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

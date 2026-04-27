import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { getResources } from '../../utils/storage.js';

export default function QuickPopupSearchBar({ onResultClick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const all = await getResources();
      const filtered = all.filter(r => 
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        (r.summary && r.summary.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 5);
      setResults(filtered);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <div className="absolute left-3 text-[#9B9B9B]">
          <Search size={14} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search saved resources..."
          className="w-full bg-white border border-[#E8E2D6] rounded-xl py-2 pl-9 pr-8 text-xs focus:outline-none focus:border-[#C49A6C] transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 text-[#A8A29E] hover:text-[#3D3832]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E8E2D6] rounded-xl shadow-xl z-50 max-h-[200px] overflow-y-auto overflow-x-hidden">
          {results.map((res) => (
            <button
              key={res.id}
              onClick={() => onResultClick(res)}
              className="w-full text-left p-3 hover:bg-[#FAF8F5] border-b border-[#E8E2D6] last:border-0 transition-colors"
            >
              <h5 className="text-xs font-semibold text-[#1A1A1A] truncate">{res.title}</h5>
              {res.summary && <p className="text-[10px] text-[#6B6B6B] truncate mt-0.5">{res.summary}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

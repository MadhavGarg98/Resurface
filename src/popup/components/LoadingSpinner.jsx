import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-3 text-slate-400 p-6">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      {text && <p className="text-sm font-medium">{text}</p>}
    </div>
  );
}

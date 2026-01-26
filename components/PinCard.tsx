import React, { useState } from 'react';
import { PinData } from '../types';

interface PinCardProps {
  pin: PinData;
  onUpdate: (id: string, data: Partial<PinData>) => void;
  onGenerateImage: (id: string) => void;
  onRegenerateText?: (id: string) => void;
  onRecreate?: (id: string) => void;
  onDownload: (id: string) => void;
  onEditImage?: (id: string, prompt: string) => Promise<void>;
}

const PinCard: React.FC<PinCardProps> = ({ pin, onUpdate, onGenerateImage, onRegenerateText, onRecreate, onDownload, onEditImage }) => {
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [isRegeneratingText, setIsRegeneratingText] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRegenerateTextClick = async () => {
      if (!onRegenerateText) return;
      setIsRegeneratingText(true);
      await onRegenerateText(pin.id);
      setIsRegeneratingText(false);
  };

  const handleRecreateClick = () => {
      if (onRecreate) {
          if (window.confirm("This will reset the entire pin (Title, Description, and Image) and generate new prompts. Continue?")) {
             onRecreate(pin.id);
          }
      }
  };

  const handleViewFullSize = () => {
    if (!pin.imageUrl) return;

    // Use Blob URL to open full size image securely.
    // This avoids "Not allowed to load local resource" or data URL limits in top-frame navigation.
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head><title>${pin.title || 'Pin Image'}</title></head>
        <body style="margin:0; display:flex; align-items:center; justify-content:center; background:#1a1a1a; height: 100vh;">
          <img src="${pin.imageUrl}" style="max-width:100%; max-height:100vh; object-fit:contain;" />
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    
    if (!win) {
        alert("Pop-up blocked. Please allow pop-ups to view full size image.");
    }
  };

  const handleEditSubmit = async () => {
    if (!onEditImage || !editPrompt.trim()) return;
    setIsProcessingEdit(true);
    try {
        await onEditImage(pin.id, editPrompt);
        setEditPrompt('');
        setIsEditingImage(false);
    } catch (e) {
        alert("Failed to edit image. Please try again.");
    } finally {
        setIsProcessingEdit(false);
    }
  };

  const isImageReady = pin.status === 'complete' && pin.imageUrl;
  const isGenerating = pin.status === 'generating_image';
  const isAnalyzing = pin.status === 'analyzing';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col h-full transition-all hover:shadow-md">
      
      {/* Header: URL */}
      <div className="p-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex items-center justify-between gap-2">
        <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium truncate flex-1" title={pin.url}>
          {pin.url}
        </p>
        <div className="flex items-center gap-2">
             {/* Product/Article Badge */}
             {pin.config?.contentType === 'product' && (
                 <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-[9px] font-bold uppercase tracking-wide border border-orange-200 dark:border-orange-800/50">
                     Product
                 </span>
             )}
            <button 
                onClick={() => handleCopy(pin.url)}
                className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-600 flex items-center gap-1 text-[10px] font-medium border border-gray-200 dark:border-slate-600"
                title="Copy URL"
            >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
            {onRecreate && (
                <button
                    onClick={handleRecreateClick}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-1 text-[10px] font-medium border border-gray-200 dark:border-slate-600"
                    title="Recreate entire pin (Start Over)"
                    disabled={isAnalyzing || isGenerating}
                >
                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            )}
        </div>
      </div>

      {/* State 1: Prompt Generation / Ready for Image */}
      {!isImageReady && (
        <div className="p-4 flex flex-col gap-4 flex-1">
            
            {/* SEO Inputs Row */}
            <div className="flex gap-2 items-end">
                <div className="grid grid-cols-2 gap-2 flex-1">
                    {/* Target Keyword */}
                    <div className="relative">
                        <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider mb-1 block">Target Keyword</label>
                        <input 
                            type="text"
                            value={pin.targetKeyword}
                            onChange={(e) => onUpdate(pin.id, { targetKeyword: e.target.value })}
                            placeholder="e.g. Strength Training"
                            className="w-full bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded px-2 py-1.5 text-xs text-indigo-900 dark:text-indigo-300 font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                            disabled={isAnalyzing || isGenerating}
                        />
                    </div>
                     {/* Annotated Interests */}
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider mb-1 block">Annotated Interests</label>
                        <input 
                            type="text"
                            value={pin.annotatedInterests}
                            onChange={(e) => onUpdate(pin.id, { annotatedInterests: e.target.value })}
                            placeholder="e.g. healthy, meal prep"
                            className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded px-2 py-1.5 text-xs text-gray-700 dark:text-slate-300 italic focus:ring-1 focus:ring-indigo-500 outline-none"
                            disabled={isAnalyzing || isGenerating}
                        />
                    </div>
                </div>
                
                {/* Regenerate Button */}
                {onRegenerateText && !isAnalyzing && (
                    <button 
                        onClick={handleRegenerateTextClick}
                        title="Regenerate Title & Description based on updated keywords"
                        disabled={isRegeneratingText}
                        className={`mb-[1px] p-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-lg transition-colors shrink-0 flex items-center justify-center h-[34px] w-[34px]
                            ${isRegeneratingText ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        {isRegeneratingText ? (
                            <svg className="animate-spin h-4 w-4 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                    </button>
                )}
            </div>

            {/* AI Prompt */}
            <div className="flex-1 flex flex-col">
                <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider mb-1 block flex justify-between">
                    <span>AI-Generated Prompt</span>
                    {!isAnalyzing && pin.visualPrompt && (
                         <span className="text-[9px] text-gray-400 dark:text-slate-500 font-normal">Editable</span>
                    )}
                </label>
                {isAnalyzing ? (
                     <div className="w-full h-32 bg-gray-100 dark:bg-slate-700/50 rounded animate-pulse flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">
                        Generating Prompt...
                     </div>
                ) : (
                    <textarea 
                        value={pin.visualPrompt}
                        onChange={(e) => onUpdate(pin.id, { visualPrompt: e.target.value })}
                        placeholder="Ready to generate prompt"
                        className="w-full h-32 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded p-2 text-xs font-mono text-gray-700 dark:text-slate-300 leading-relaxed focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                        disabled={isGenerating}
                    />
                )}
            </div>

            {/* Action Button */}
            <button
                onClick={() => onGenerateImage(pin.id)}
                disabled={isAnalyzing || isGenerating || !pin.visualPrompt}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm flex items-center justify-center gap-2
                ${isAnalyzing || isGenerating || !pin.visualPrompt ? 'bg-indigo-300 dark:bg-indigo-800/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                {isGenerating ? (
                    <>
                       <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Pin...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Create Pin
                    </>
                )}
            </button>
        </div>
      )}

      {/* State 2: Image Generated / Complete */}
      {isImageReady && (
         <div className="flex flex-col h-full">
            {/* Image Preview - Fixed Aspect Ratio container */}
            <div className="relative w-full aspect-[9/16] bg-gray-100 dark:bg-slate-900 group shrink-0 max-h-[300px] overflow-hidden">
                <img 
                    src={pin.imageUrl} 
                    alt={pin.title} 
                    className={`w-full h-full object-cover transition-opacity ${isProcessingEdit ? 'opacity-50' : 'opacity-100'}`}
                />
                 {/* Overlay on hover */}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                     <button 
                        onClick={handleViewFullSize}
                        className="bg-white/90 p-2 rounded-full hover:bg-white text-gray-800"
                        title="View Full Size"
                     >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                     </button>
                     <button 
                        onClick={() => setIsEditingImage(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md transform hover:scale-105 transition-all"
                     >
                        Edit Image
                     </button>
                 </div>
                 
                 {/* Processing Spinner */}
                 {isProcessingEdit && (
                     <div className="absolute inset-0 flex items-center justify-center">
                         <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                     </div>
                 )}
            </div>

            {/* Edit Mode Overlay */}
            {isEditingImage && (
                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Magic Edit (Nano Banana)</label>
                        <button onClick={() => setIsEditingImage(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="e.g. Add a retro filter, remove person..."
                            className="flex-1 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded p-1.5 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                        <button 
                            onClick={handleEditSubmit}
                            disabled={!editPrompt.trim() || isProcessingEdit}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                        >
                            Go
                        </button>
                    </div>
                </div>
            )}

            {/* Editable Content */}
            <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
                 {/* Regenerate Text Button Row */}
                 <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <span className="text-[10px] font-medium text-indigo-900 dark:text-indigo-300">Content Options</span>
                    <button 
                        onClick={handleRegenerateTextClick}
                        disabled={isRegeneratingText}
                        className={`text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1 rounded shadow-sm flex items-center gap-1 transition-all ${isRegeneratingText ? 'opacity-50' : ''}`}
                        title="Regenerate Title, Description & Visual Prompt"
                    >
                         {isRegeneratingText ? (
                             <>
                             <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             Regenerating...
                             </>
                         ) : (
                             <>
                             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                             Regenerate Text
                             </>
                         )}
                    </button>
                 </div>

                 {/* Title */}
                 <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Title</label>
                        <button onClick={() => handleCopy(pin.title)} className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded border border-gray-100 dark:border-slate-600">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                             Copy
                        </button>
                    </div>
                    <textarea 
                        value={pin.title}
                        onChange={(e) => onUpdate(pin.id, { title: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm font-bold text-gray-800 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none resize-none h-16"
                    />
                 </div>

                 {/* Description */}
                 <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Description</label>
                        <button onClick={() => handleCopy(pin.description)} className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded border border-gray-100 dark:border-slate-600">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                             Copy
                        </button>
                    </div>
                    <textarea 
                        value={pin.description}
                        onChange={(e) => onUpdate(pin.id, { description: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-xs text-gray-600 dark:text-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none resize-none h-24"
                    />
                 </div>

                 {/* Visual Prompt (Editable for Recreation) */}
                 <div>
                     <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider mb-1 block">Visual Prompt</label>
                     <textarea 
                        value={pin.visualPrompt}
                        onChange={(e) => onUpdate(pin.id, { visualPrompt: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded p-2 text-xs font-mono text-gray-600 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-20"
                    />
                 </div>
                 
                 {/* Tags */}
                 {pin.tags.length > 0 && (
                     <div className="flex flex-wrap gap-1">
                        {pin.tags.map((tag, i) => (
                           <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 text-[10px] rounded-full">#{tag}</span> 
                        ))}
                     </div>
                 )}
            </div>

            {/* Footer Buttons */}
            <div className="p-3 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-100 dark:border-slate-700 flex gap-2">
                 <button
                    onClick={() => onGenerateImage(pin.id)} // Regenerate logic
                    disabled={isGenerating}
                    className="flex-1 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-md text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                 >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Regenerate Image
                 </button>
                 <button
                    onClick={() => onDownload(pin.id)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                 >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Pin
                 </button>
            </div>
         </div>
      )}

      {/* Error Overlay */}
      {pin.status === 'error' && (
         <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full p-3 mb-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-white">Generation Failed</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">{pin.error || 'Something went wrong.'}</p>
            <button 
                onClick={() => onUpdate(pin.id, { status: isImageReady ? 'complete' : 'ready_for_generation', error: undefined })}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
                Dismiss
            </button>
         </div>
      )}
    </div>
  );
};

export default PinCard;
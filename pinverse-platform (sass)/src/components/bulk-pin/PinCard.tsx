"use client";

import React, { useState } from 'react';
import { PinData } from '@/lib/types';
import { Copy, Check, RefreshCw, Download, Eye, Edit3, X, Loader2 } from 'lucide-react';

interface PinCardProps {
    pin: PinData;
    onUpdate: (id: string, data: Partial<PinData>) => void;
    onGenerateImage: (id: string) => void;
    onRegenerateText?: (id: string) => void;
    onRecreate?: (id: string) => void;
    onDownload: (id: string) => void;
    onEditImage?: (id: string, prompt: string) => Promise<void>;
}

export default function PinCard({ pin, onUpdate, onGenerateImage, onRegenerateText, onRecreate, onDownload, onEditImage }: PinCardProps) {
    const [isEditingImage, setIsEditingImage] = useState(false);
    const [editPrompt, setEditPrompt] = useState('');
    const [isProcessingEdit, setIsProcessingEdit] = useState(false);
    const [isRegeneratingText, setIsRegeneratingText] = useState(false);
    const [copied, setCopied] = useState('');

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(''), 2000);
    };

    const handleRegenerateTextClick = async () => {
        if (!onRegenerateText) return;
        setIsRegeneratingText(true);
        await onRegenerateText(pin.id);
        setIsRegeneratingText(false);
    };

    const handleRecreateClick = () => {
        if (onRecreate && window.confirm("This will reset the entire pin and generate new prompts. Continue?")) {
            onRecreate(pin.id);
        }
    };

    const handleViewFullSize = () => {
        if (!pin.imageUrl) return;
        const htmlContent = `<!DOCTYPE html><html><head><title>${pin.title || 'Pin Image'}</title></head><body style="margin:0; display:flex; align-items:center; justify-content:center; background:#1a1a1a; height: 100vh;"><img src="${pin.imageUrl}" style="max-width:100%; max-height:100vh; object-fit:contain;" /></body></html>`;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const handleEditSubmit = async () => {
        if (!onEditImage || !editPrompt.trim()) return;
        setIsProcessingEdit(true);
        try {
            await onEditImage(pin.id, editPrompt);
            setEditPrompt('');
            setIsEditingImage(false);
        } catch {
            alert("Failed to edit image. Please try again.");
        } finally {
            setIsProcessingEdit(false);
        }
    };

    const isImageReady = pin.status === 'complete' && pin.imageUrl;
    const isGenerating = pin.status === 'generating_image';
    const isAnalyzing = pin.status === 'analyzing';

    return (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden flex flex-col h-full transition-all hover:shadow-md">
            {/* Header: URL */}
            <div className="p-3 border-b border-slate-700 bg-slate-700/50 flex items-center justify-between gap-2">
                <p className="text-xs text-yellow-400 font-medium truncate flex-1" title={pin.url}>{pin.url}</p>
                <div className="flex items-center gap-2">
                    {pin.config?.contentType === 'product' && (
                        <span className="px-1.5 py-0.5 bg-orange-900/30 text-orange-400 rounded text-[9px] font-bold uppercase border border-orange-800/50">Product</span>
                    )}
                    <button onClick={() => handleCopy(pin.url, 'url')} className="text-slate-400 hover:text-yellow-400 p-1 rounded hover:bg-slate-600" title="Copy URL">
                        {copied === 'url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    {onRecreate && (
                        <button onClick={handleRecreateClick} className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-red-900/30" title="Recreate entire pin" disabled={isAnalyzing || isGenerating}>
                            <RefreshCw className="w-3 h-3" />
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
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Target Keyword</label>
                                <input type="text" value={pin.targetKeyword} onChange={(e) => onUpdate(pin.id, { targetKeyword: e.target.value })}
                                    placeholder="e.g. Strength Training" className="w-full bg-yellow-900/10 border border-yellow-800/50 rounded px-2 py-1.5 text-xs text-yellow-300 font-medium" disabled={isAnalyzing || isGenerating} />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Annotated Interests</label>
                                <input type="text" value={pin.annotatedInterests} onChange={(e) => onUpdate(pin.id, { annotatedInterests: e.target.value })}
                                    placeholder="e.g. healthy, meal prep" className="w-full bg-slate-700/50 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 italic" disabled={isAnalyzing || isGenerating} />
                            </div>
                        </div>
                        {onRegenerateText && !isAnalyzing && (
                            <button onClick={handleRegenerateTextClick} disabled={isRegeneratingText} title="Regenerate Text"
                                className={`p-2 bg-yellow-900/20 hover:bg-yellow-900/40 text-yellow-400 border border-yellow-800/50 rounded-lg shrink-0 h-[34px] w-[34px] flex items-center justify-center ${isRegeneratingText ? 'opacity-50 cursor-wait' : ''}`}>
                                {isRegeneratingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                        )}
                    </div>

                    {/* AI Prompt */}
                    <div className="flex-1 flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex justify-between">
                            <span>Visual Prompt</span>
                            {!isAnalyzing && pin.visualPrompt && <span className="text-[9px] text-slate-500 font-normal">Editable</span>}
                        </label>
                        {isAnalyzing ? (
                            <div className="w-full h-32 bg-slate-700/50 rounded animate-pulse flex items-center justify-center text-xs text-slate-500">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating Prompt...
                            </div>
                        ) : (
                            <textarea value={pin.visualPrompt} onChange={(e) => onUpdate(pin.id, { visualPrompt: e.target.value })}
                                placeholder="Ready to generate prompt" className="w-full h-32 bg-slate-700/50 border border-slate-600 rounded p-2 text-xs font-mono text-slate-300 resize-none" disabled={isGenerating} />
                        )}
                    </div>

                    {/* Action Button */}
                    <button onClick={() => onGenerateImage(pin.id)} disabled={isAnalyzing || isGenerating || !pin.visualPrompt}
                        className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm flex items-center justify-center gap-2
            ${isAnalyzing || isGenerating || !pin.visualPrompt ? 'bg-yellow-400/30 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 text-slate-900'}`}>
                        {isGenerating ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating Pin...</>) : (<>Create Pin</>)}
                    </button>
                </div>
            )}

            {/* State 2: Image Generated / Complete */}
            {isImageReady && (
                <div className="flex flex-col h-full">
                    {/* Image Preview */}
                    <div className="relative w-full aspect-[9/16] bg-slate-900 group shrink-0 max-h-[280px] overflow-hidden">
                        <img src={pin.imageUrl} alt={pin.title} className={`w-full h-full object-cover ${isProcessingEdit ? 'opacity-50' : ''}`} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <button onClick={handleViewFullSize} className="bg-white/90 p-2 rounded-full hover:bg-white text-slate-800" title="View Full Size">
                                <Eye className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsEditingImage(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                                Edit Image
                            </button>
                        </div>
                        {isProcessingEdit && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Edit Mode Overlay */}
                    {isEditingImage && (
                        <div className="p-3 bg-slate-700/50 border-b border-slate-600">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] uppercase font-bold text-slate-400">Magic Edit</label>
                                <button onClick={() => setIsEditingImage(false)} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g. Add a retro filter..."
                                    className="flex-1 text-xs bg-slate-800 border border-slate-600 text-slate-200 rounded p-1.5" />
                                <button onClick={handleEditSubmit} disabled={!editPrompt.trim() || isProcessingEdit}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50">Go</button>
                            </div>
                        </div>
                    )}

                    {/* Editable Content */}
                    <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
                        {/* Regenerate Text Button Row */}
                        <div className="flex justify-between items-center bg-yellow-900/10 p-2 rounded-lg border border-yellow-800/30">
                            <span className="text-[10px] font-medium text-yellow-300">Content Options</span>
                            <button onClick={handleRegenerateTextClick} disabled={isRegeneratingText}
                                className={`text-xs bg-slate-800 border border-yellow-800 text-yellow-400 hover:bg-yellow-900/20 px-2 py-1 rounded shadow-sm flex items-center gap-1 ${isRegeneratingText ? 'opacity-50' : ''}`}>
                                {isRegeneratingText ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerating...</> : <><RefreshCw className="w-3.5 h-3.5" /> Regenerate Text</>}
                            </button>
                        </div>

                        {/* Title */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Title</label>
                                <button onClick={() => handleCopy(pin.title, 'title')} className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-200 bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-600">
                                    {copied === 'title' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                                </button>
                            </div>
                            <textarea value={pin.title} onChange={(e) => onUpdate(pin.id, { title: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm font-bold text-slate-100 resize-none h-14" />
                        </div>

                        {/* Description */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Description</label>
                                <button onClick={() => handleCopy(pin.description, 'desc')} className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-200 bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-600">
                                    {copied === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                                </button>
                            </div>
                            <textarea value={pin.description} onChange={(e) => onUpdate(pin.id, { description: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 resize-none h-20" />
                        </div>

                        {/* Tags */}
                        {pin.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {pin.tags.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-slate-700 text-slate-400 text-[10px] rounded-full">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="p-3 bg-slate-700/30 border-t border-slate-700 flex gap-2">
                        <button onClick={() => onGenerateImage(pin.id)} disabled={isGenerating}
                            className="flex-1 py-2 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" /> Regenerate Image
                        </button>
                        <button onClick={() => onDownload(pin.id)}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5">
                            <Download className="w-3.5 h-3.5" /> Download Pin
                        </button>
                    </div>
                </div>
            )}

            {/* Error Overlay */}
            {pin.status === 'error' && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-10">
                    <div className="bg-red-900/20 text-red-400 rounded-full p-3 mb-2">
                        <X className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Generation Failed</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-4">{pin.error || 'Something went wrong.'}</p>
                    <button onClick={() => onUpdate(pin.id, { status: isImageReady ? 'complete' : 'ready_for_generation', error: undefined })}
                        className="text-xs text-yellow-400 font-medium hover:underline">Dismiss</button>
                </div>
            )}
        </div>
    );
}

"use client";

import React, { useState, useRef } from 'react';
import { PinConfig, PinStyle, AspectRatio, ImageModel, LogoPosition } from '@/lib/types';
import { parseFile } from '@/lib/fileParser';

import { Upload, Link2, Image, X, Sparkles, Loader2 } from 'lucide-react';


interface InputSectionProps {
    onGeneratePrompts: (urls: string[], config: PinConfig) => void;
    isProcessing: boolean;
    config: PinConfig;
    onConfigChange: (config: PinConfig) => void;
}

export default function InputSection({ onGeneratePrompts, isProcessing, config, onConfigChange }: InputSectionProps) {
    const [inputText, setInputText] = useState('');
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const refImageInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = () => {
        if (!inputText.trim()) return;
        const urls = inputText.split('\n').filter(line => line.trim().length > 0);
        onGeneratePrompts(urls, config);
        setInputText('');
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const content = await parseFile(file);
            if (content) {
                const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
                if (lines.length > 0) {
                    setInputText(prev => (prev.trim() ? prev.trim() + '\n' : '') + lines.join('\n'));
                }
            }
        } catch (error) {
            console.error('File parsing error:', error);
            alert('Failed to parse file. Please check the file format.');
        }
        event.target.value = '';
    };

    const handleReferenceImagesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        Array.from(files).forEach((file: File) => {
            if (file.size > 4 * 1024 * 1024) {
                alert(`Image ${file.name} is too large. Max size 4MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                    onConfigChange({ ...config, referenceImages: [...(config.referenceImages || []), result] });
                }
            };
            reader.readAsDataURL(file);
        });
        event.target.value = '';
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("Logo too large. Please use a file under 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) onConfigChange({ ...config, logoData: e.target.result as string });
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleAddImageUrl = async () => {
        if (!imageUrlInput.trim()) return;
        setIsLoadingUrl(true);
        try {
            const response = await fetch(imageUrlInput);
            if (!response.ok) throw new Error("Failed to fetch");
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    onConfigChange({ ...config, referenceImages: [...(config.referenceImages || []), reader.result as string] });
                    setImageUrlInput('');
                }
                setIsLoadingUrl(false);
            };
            reader.readAsDataURL(blob);
        } catch {
            alert("Could not load image from URL. Please download and upload manually.");
            setIsLoadingUrl(false);
        }
    };

    const removeReferenceImage = (index: number) => {
        onConfigChange({ ...config, referenceImages: (config.referenceImages || []).filter((_, i) => i !== index) });
    };

    const positionOptions = [
        { value: 'bottom-right', label: 'Bottom Right' },
        { value: 'bottom-center', label: 'Bottom Center' },
        { value: 'bottom-left', label: 'Bottom Left' },
        { value: 'top-right', label: 'Top Right' },
        { value: 'top-center', label: 'Top Center' },
        { value: 'top-left', label: 'Top Left' },
        { value: 'center', label: 'Center' },
    ];

    return (
        <div
            className="w-full lg:w-80 xl:w-96 p-5 flex flex-col h-full shrink-0 overflow-y-auto"
            style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--border)', color: '#E2E8F0' }}
        >
            {/* Content Type Toggle */}
            <div className="mb-4 p-1 rounded-lg flex bg-black/20">
                <button onClick={() => onConfigChange({ ...config, contentType: 'article' })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${config.contentType === 'article' ? 'shadow-sm' : ''}`}
                    style={config.contentType === 'article' ? { background: 'var(--secondary)', color: 'var(--primary)' } : { color: 'var(--muted)' }}>
                    Standard Post
                </button>
                <button onClick={() => onConfigChange({ ...config, contentType: 'product' })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${config.contentType === 'product' ? 'shadow-sm' : ''}`}
                    style={config.contentType === 'product' ? { background: 'var(--secondary)', color: 'var(--primary)' } : { color: 'var(--muted)' }}>
                    Product
                </button>
            </div>

            {/* URL Input */}
            <div className="mb-2 flex justify-between items-center">
                <h2 className="text-xs font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: '#E2E8F0' }}>
                    <Link2 className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    {config.contentType === 'product' ? 'Product URLs' : 'Article URLs'}
                </h2>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv,.xlsx,.xls,.docx,.pdf" />
                <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-medium hover:opacity-80" style={{ color: 'var(--primary)' }}>
                    Import List
                </button>
            </div>
            <textarea
                className="w-full min-h-[400px] rounded-lg p-3 text-xs font-mono outline-none resize-y mb-4 input-themed"
                placeholder={config.contentType === 'product' ? "https://amazon.com/dp/..." : "https://yourdomain.com/post-1"}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isProcessing}
            />

            {/* Logo Overlay Section */}
            <div className="mb-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: '#E2E8F0' }}>
                        <Image className="w-3.5 h-3.5" style={{ color: '#EC4899' }} /> Logo Overlay
                    </label>
                    {config.logoData && <button onClick={() => onConfigChange({ ...config, logoData: undefined })} className="text-[10px]" style={{ color: '#EF4444' }}>Remove</button>}
                </div>
                <div className="rounded-lg p-3 space-y-3 bg-black/20" style={{ border: '1px solid var(--border)' }}>
                    {!config.logoData ? (
                        <div onClick={() => logoInputRef.current?.click()}
                            className="w-full h-12 border border-dashed rounded flex items-center justify-center cursor-pointer text-[10px] hover:bg-white/5 transition-colors"
                            style={{ borderColor: 'var(--muted)', color: 'var(--muted)' }}>
                            + Upload Logo (PNG)
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded flex items-center justify-center p-1 bg-white/5" style={{ border: '1px solid var(--border)' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={config.logoData} alt="Logo" className="max-w-full max-h-full object-contain" />

                            </div>
                            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Logo loaded</span>
                        </div>
                    )}
                    <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/png,image/jpeg" className="hidden" />
                    {config.logoData && (
                        <>
                            <div>
                                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Position</label>
                                <select value={config.logoPosition || 'bottom-right'} onChange={(e) => onConfigChange({ ...config, logoPosition: e.target.value as LogoPosition })}
                                    className="w-full text-xs rounded p-1.5 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-pink-500">
                                    {positionOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>Size</label>
                                    <span className="text-[9px]" style={{ color: '#64748B' }}>{config.logoSize || 20}%</span>
                                </div>
                                <input type="range" min="10" max="60" step="5" value={config.logoSize || 20}
                                    onChange={(e) => onConfigChange({ ...config, logoSize: Number(e.target.value) })}
                                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-pink-500 bg-white/10" />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* CTA Section */}
            <div className="mb-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-2" style={{ color: '#E2E8F0' }}>
                    <Sparkles className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} /> Call to Action (CTA)
                </label>
                <div className="rounded-lg p-3 space-y-3 bg-black/20" style={{ border: '1px solid var(--border)' }}>
                    <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Button Text</label>
                        <input type="text" value={config.ctaText || ''} onChange={(e) => onConfigChange({ ...config, ctaText: e.target.value })}
                            placeholder="e.g. Shop Now, Read More" className="w-full text-xs rounded p-2 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-blue-500" />
                    </div>
                    {config.ctaText && (
                        <>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Button Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={config.ctaColor || '#E60023'} onChange={(e) => onConfigChange({ ...config, ctaColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" />
                                        <span className="text-[10px] font-mono" style={{ color: '#64748B' }}>{config.ctaColor || '#E60023'}</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Text Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={config.ctaTextColor || '#FFFFFF'} onChange={(e) => onConfigChange({ ...config, ctaTextColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" />
                                        <span className="text-[10px] font-mono" style={{ color: '#64748B' }}>{config.ctaTextColor || '#FFFFFF'}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Position</label>
                                <select value={config.ctaPosition || 'bottom-center'} onChange={(e) => onConfigChange({ ...config, ctaPosition: e.target.value as LogoPosition })}
                                    className="w-full text-xs rounded p-1.5 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-blue-500">
                                    {positionOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Reference Images */}
            <div className="mb-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <label className="text-xs font-bold uppercase tracking-wide mb-2 block" style={{ color: '#E2E8F0' }}>
                    Reference Assets <span className="font-normal normal-case" style={{ color: 'var(--muted)' }}>(Optional)</span>
                </label>
                <div className="flex gap-2 mb-3">
                    <input type="text" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="Paste Image Link..."
                        className="flex-1 rounded-lg px-2 py-1.5 text-xs bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-blue-500" />
                    <button onClick={handleAddImageUrl} disabled={isLoadingUrl || !imageUrlInput}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors">
                        {isLoadingUrl ? '...' : 'Add'}
                    </button>
                </div>
                <input type="file" ref={refImageInputRef} onChange={handleReferenceImagesUpload} className="hidden" accept="image/*" multiple />
                <div onClick={() => refImageInputRef.current?.click()}
                    className="w-full h-14 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer mb-3 hover:bg-white/5 transition-colors"
                    style={{ borderColor: 'var(--muted)' }}>
                    <div className="flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <Upload className="w-4 h-4" />
                        <span className="text-[10px]">Upload Files</span>
                    </div>
                </div>
                {(config.referenceImages?.length || 0) > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {config.referenceImages?.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded overflow-hidden group border border-white/10 bg-black/40">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />

                                <button onClick={() => removeReferenceImage(idx)}
                                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pin Settings */}
            <div className="space-y-4 flex-1 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#E2E8F0' }}>Pin Style:</label>
                    <select value={config.style} onChange={(e) => onConfigChange({ ...config, style: e.target.value as PinStyle })}
                        className="w-full text-xs rounded-lg p-2.5 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-yellow-500" disabled={isProcessing}>
                        <option value="basic_top" className="bg-slate-800">Basic - Text at Top</option>
                        <option value="basic_middle" className="bg-slate-800">Basic - Text at Middle</option>
                        <option value="basic_bottom" className="bg-slate-800">Basic - Text at Bottom</option>
                        <option value="collage" className="bg-slate-800">Collage - Multiple Images</option>
                        <option value="custom" className="bg-slate-800">Custom - Your Brand Guidelines</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#E2E8F0' }}>Aspect Ratio:</label>
                    <select value={config.ratio} onChange={(e) => onConfigChange({ ...config, ratio: e.target.value as AspectRatio })}
                        className="w-full text-xs rounded-lg p-2.5 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-yellow-500" disabled={isProcessing}>
                        <option value="9:16" className="bg-slate-800">9:16 - Standard Pinterest (Recommended)</option>
                        <option value="2:3" className="bg-slate-800">2:3 - Classic Portrait</option>
                        <option value="1:2" className="bg-slate-800">1:2 - Tall Pin</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#E2E8F0' }}>Image Model:</label>
                    <select value={config.model} onChange={(e) => onConfigChange({ ...config, model: e.target.value as ImageModel })}
                        className="w-full text-xs rounded-lg p-2.5 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-yellow-500" disabled={isProcessing}>
                        <optgroup label="Google" className="bg-slate-800">
                            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fastest)</option>
                            <option value="gemini-3-pro-image-preview">Nano Banana Pro (High Res)</option>
                            <option value="imagen-4.0-generate-001">Google Imagen 3 (High Quality)</option>
                        </optgroup>
                        <optgroup label="Replicate" className="bg-slate-800">
                            <option value="flux-schnell">Flux Schnell (Speed)</option>
                            <option value="flux-dev">Flux Dev (Quality)</option>
                            <option value="sdxl-turbo">SDXL Turbo (Fastest)</option>
                            <option value="ideogram">Ideogram (Text Rendering)</option>
                            <option value="seedream4">SeeDream 4 (High Quality)</option>
                            <option value="pruna">Pruna AI ($0.01/img)</option>
                        </optgroup>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#E2E8F0' }}>Website URL (On Image):</label>
                    <input type="text" value={config.websiteUrl || ''} onChange={(e) => onConfigChange({ ...config, websiteUrl: e.target.value })}
                        placeholder="e.g. mydomain.com" className="w-full rounded-lg p-2.5 text-xs bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-yellow-500" disabled={isProcessing} />
                </div>
            </div>

            {/* Generate Button */}
            <div className="mt-6">
                <button onClick={handleGenerate} disabled={isProcessing || !inputText.trim()}
                    className={`w-full py-3 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all
          ${isProcessing || !inputText.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-yellow-400/20'}`}
                    style={{ background: 'var(--primary)', color: '#0F172A' }}>
                    {isProcessing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : (
                        <><Sparkles className="w-4 h-4" /> Generate Prompts</>
                    )}
                </button>
            </div>
        </div>
    );
}


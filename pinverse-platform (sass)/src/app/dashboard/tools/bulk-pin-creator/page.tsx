"use client";

import React, { useState, useEffect } from 'react';
import { Image, Download, Trash2, FileText, Table, Sparkles, Settings } from 'lucide-react';
import { PinData, PinConfig, CSVSettings } from '@/lib/types';
import { generatePinDetails, generatePinImage, regeneratePinText, editPinImage } from '@/lib/geminiService';
import { getUser } from '@/lib/supabase';
import { logActivity, incrementPinCount, updateLastActive } from '@/lib/adminData';
import InputSection from '@/components/bulk-pin/InputSection';
import PinCard from '@/components/bulk-pin/PinCard';
import CSVEditor from '@/components/bulk-pin/CSVEditor';
import ChatBot from '@/components/bulk-pin/ChatBot';
import { getUserSettingsAction, updateUserSettingsAction } from "@/app/actions/user-settings-actions";
import SettingsModal from '@/components/bulk-pin/SettingsModal';
import { GEMINI_CONTENT_MODELS, GEMINI_IMAGE_MODELS } from '@/lib/gemini-enhanced';
import { REPLICATE_CONTENT_MODELS, REPLICATE_IMAGE_MODELS } from '@/lib/replicate-enhanced';
import { PIN_TEMPLATES, SYSTEM_PIN_TEMPLATES, getTemplateById } from '@/lib/pin-templates-library';
import type { PinTemplate } from '@/lib/pin-templates-library';
import { generateSinglePin } from '@/app/actions/bulk-pin-enhanced/generation';
import { DEFAULT_TEXT_RULES, DEFAULT_IMAGE_RULES } from '@/lib/bulk-pin-constants';


const DEFAULT_CONFIG: PinConfig = {
    style: 'basic_bottom', ratio: '9:16', model: 'gemini-2.5-flash-image', contentType: 'article',
    websiteUrl: '', referenceImages: [], imageSize: '1K', logoData: undefined, logoPosition: 'bottom-right',
    logoSize: 20, ctaText: '', ctaColor: '#E60023', ctaTextColor: '#FFFFFF', ctaPosition: 'bottom-center'
};

export default function BulkPinCreatorPage() {
    const [googleApiKey, setGoogleApiKey] = useState('');
    const [replicateApiKey, setReplicateApiKey] = useState('');
    const [imgbbApiKey, setImgbbApiKey] = useState('');
    const [pins, setPins] = useState<PinData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [config, setConfig] = useState<PinConfig>(DEFAULT_CONFIG);
    const [textRules, setTextRules] = useState(DEFAULT_TEXT_RULES);
    const [imageRules, setImageRules] = useState(DEFAULT_IMAGE_RULES);
    const [showCSVEditor, setShowCSVEditor] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [csvSettings, setCsvSettings] = useState<CSVSettings>({ imgbbApiKey: '', postInterval: '60', pinsPerDay: 10 });
    const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
    const [enhancedMode, setEnhancedMode] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('basic-text-middle');
    const [selectedContentModel, setSelectedContentModel] = useState('gemini-2.5-flash');
    const [contentProvider, setContentProvider] = useState<'gemini' | 'replicate'>('gemini');
    const [imageProvider, setImageProvider] = useState<'gemini' | 'replicate'>('gemini');
    const [customTemplates, setCustomTemplates] = useState<PinTemplate[]>([]);

    // Load custom templates from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('pinverse_custom_templates');
        if (saved) try { setCustomTemplates(JSON.parse(saved)); } catch { }
    }, []);


    useEffect(() => {
        // Load API Keys from DB
        getUserSettingsAction().then(({ settings }) => {
            if (settings) {
                setGoogleApiKey(settings.gemini_api_key || '');
                setReplicateApiKey(settings.replicate_api_key || '');
                setImgbbApiKey(settings.imgbb_api_key || '');
            }
        });

        const savedConfig = localStorage.getItem('pinverse_pin_config');
        if (savedConfig) try { setConfig(JSON.parse(savedConfig)); } catch { }
        const savedTextRules = localStorage.getItem('pinverse_text_rules');
        const savedImageRules = localStorage.getItem('pinverse_image_rules');
        const savedCsvSettings = localStorage.getItem('pinverse_csv_settings');
        if (savedTextRules) setTextRules(savedTextRules);
        if (savedImageRules) setImageRules(savedImageRules);
        if (savedCsvSettings) try { setCsvSettings(JSON.parse(savedCsvSettings)); } catch { }

        // Get current user for activity logging
        getUser().then(({ user }) => {
            if (user) {
                setCurrentUser({ id: user.id, email: user.email || '' });
            }
        });
    }, []);

    const updateConfig = (newConfig: PinConfig) => {
        setConfig(newConfig);
        localStorage.setItem('pinverse_pin_config', JSON.stringify(newConfig));
    };



    const handleSaveSettings = async (newTextRules: string, newImageRules: string, newConfig: PinConfig, newReplicateKey: string, newGoogleKey: string, newCsvSettings: CSVSettings) => {
        setTextRules(newTextRules);
        setImageRules(newImageRules);
        setConfig(newConfig);
        setReplicateApiKey(newReplicateKey);
        setGoogleApiKey(newGoogleKey);
        setCsvSettings(newCsvSettings);
        setImgbbApiKey(newCsvSettings.imgbbApiKey);

        // Save Rules to LocalStorage (User Preference)
        localStorage.setItem('pinverse_text_rules', newTextRules);
        localStorage.setItem('pinverse_image_rules', newImageRules);
        localStorage.setItem('pinverse_pin_config', JSON.stringify(newConfig));
        localStorage.setItem('pinverse_csv_settings', JSON.stringify(newCsvSettings));

        // Save Keys to Database
        await updateUserSettingsAction({
            gemini_api_key: newGoogleKey,
            replicate_api_key: newReplicateKey,
            imgbb_api_key: newCsvSettings.imgbbApiKey
        });

        // Clean up old local storage keys
        localStorage.removeItem('pinverse_replicate_api_key');
        localStorage.removeItem('pinverse_google_api_key');
        localStorage.removeItem('pinverse_imgbb_api_key');
    };

    const handleGeneratePrompts = async (urls: string[], pinConfig: PinConfig) => {
        if (!googleApiKey) { alert("Please add your Google Gemini API key in Account Settings first."); return; }
        setIsProcessing(true);
        const newPins: PinData[] = urls.map(url => ({
            id: Math.random().toString(36).substr(2, 9), url, status: 'analyzing', targetKeyword: '', annotatedInterests: '',
            visualPrompt: '', title: '', description: '', tags: [], config: { ...pinConfig }
        }));
        setPins(prev => [...newPins, ...prev]);

        for (const pin of newPins) {
            try {
                const details = await generatePinDetails(pin.url, pin.config, textRules, imageRules, '', '', googleApiKey);
                setPins(current => current.map(p => p.id === pin.id ? {
                    ...p, status: 'ready_for_generation', targetKeyword: details.targetKeyword || '',
                    visualPrompt: details.visualPrompt, title: details.title, description: details.description, tags: details.tags
                } : p));
            } catch {
                setPins(current => current.map(p => p.id === pin.id ? { ...p, status: 'error', error: 'Failed to analyze URL' } : p));
            }
        }
        setIsProcessing(false);
    };

    const handleGenerateImage = async (id: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin) return;
        setPins(current => current.map(p => p.id === id ? { ...p, status: 'generating_image', error: undefined } : p));
        try {
            const imageUrl = await generatePinImage(pin.visualPrompt, pin.config, googleApiKey, replicateApiKey);
            setPins(current => current.map(p => p.id === id ? { ...p, status: 'complete', imageUrl } : p));

            // Log activity when pin is successfully generated
            if (currentUser) {
                logActivity(
                    currentUser.id,
                    currentUser.email,
                    'pin_created',
                    `Created pin: ${pin.title.substring(0, 50)}${pin.title.length > 50 ? '...' : ''}`,
                    { pinId: id, title: pin.title }
                );
                // Update the user's pin count in their profile
                incrementPinCount(currentUser.id);
                // Update user's last active timestamp
                updateLastActive(currentUser.id);
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Image generation failed';
            setPins(current => current.map(p => p.id === id ? { ...p, status: 'error', error: errorMessage } : p));
        }
    };

    const handleEnhancedGenerate = async (id: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin) return;

        // Require a template when enhanced mode is active
        const template = getTemplateById(selectedTemplate);
        if (!template) {
            alert('Please select a Pin Style Template to use Enhanced Mode.');
            return;
        }

        // Check if Gemini model selected but no key
        if (selectedContentModel.startsWith('gemini-') && !googleApiKey) {
            alert('Gemini API key not configured. Please add it in Settings.');
            return;
        }

        // Determine provider from model
        const isGeminiModel = selectedContentModel.startsWith('gemini-');
        const effectiveContentProvider = isGeminiModel ? 'gemini' as const : 'replicate' as const;

        setPins(current => current.map(p => p.id === id ? { ...p, status: 'generating_image', error: undefined } : p));
        try {
            const result = await generateSinglePin({
                url: pin.url,
                keywords: pin.targetKeyword,
                templateSlug: selectedTemplate,
                contentProvider: effectiveContentProvider,
                contentModel: selectedContentModel,
                imageProvider: imageProvider,
                imageModel: imageProvider === 'gemini' ? 'gemini-3-pro-image-preview' : 'flux-dev',
                stylePrompt: template.guidelines.replace('${url}', pin.url),
            });

            if (result.success && result.pin) {
                const enhancedPin: PinData = {
                    ...pin,
                    title: result.pin.title,
                    description: result.pin.description,
                    imageUrl: result.pin.imageUrl,
                    status: 'complete',
                };
                setPins(current => current.map(p => p.id === id ? enhancedPin : p));
            } else {
                setPins(current => current.map(p => p.id === id ? { ...p, status: 'error', error: result.error || 'Enhanced generation failed' } : p));
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Enhanced generation failed';
            setPins(current => current.map(p => p.id === id ? { ...p, status: 'error', error: errorMessage } : p));
        }
    };

    const handleRegenerateText = async (id: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin || !googleApiKey) return;
        try {
            const details = await regeneratePinText(pin.url, pin.targetKeyword, pin.annotatedInterests, textRules, imageRules, googleApiKey);
            setPins(current => current.map(p => p.id === id ? {
                ...p, visualPrompt: details.visualPrompt || p.visualPrompt, title: details.title, description: details.description, tags: details.tags
            } : p));
        } catch { alert("Failed to regenerate text."); }
    };

    const handleRecreate = async (id: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin || !googleApiKey) return;
        setPins(current => current.map(p => p.id === id ? { ...p, status: 'analyzing', imageUrl: undefined } : p));
        try {
            const details = await generatePinDetails(pin.url, pin.config, textRules, imageRules, pin.annotatedInterests, pin.targetKeyword, googleApiKey);
            setPins(current => current.map(p => p.id === id ? {
                ...p, status: 'ready_for_generation', targetKeyword: details.targetKeyword || '', visualPrompt: details.visualPrompt,
                title: details.title, description: details.description, tags: details.tags
            } : p));
        } catch {
            setPins(current => current.map(p => p.id === id ? { ...p, status: 'error', error: 'Failed to recreate pin' } : p));
        }
    };

    const handleEditImage = async (id: string, prompt: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin?.imageUrl || !googleApiKey) return;
        const newImageUrl = await editPinImage(pin.imageUrl, prompt, googleApiKey);
        setPins(current => current.map(p => p.id === id ? { ...p, imageUrl: newImageUrl } : p));
    };

    const handleUpdatePin = (id: string, data: Partial<PinData>) => {
        setPins(current => current.map(p => p.id === id ? { ...p, ...data } : p));
    };

    const handleDeletePin = (id: string) => { setPins(current => current.filter(p => p.id !== id)); };

    const handleDownload = (id: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin?.imageUrl) return;
        const link = document.createElement('a');
        link.href = pin.imageUrl;
        link.download = `${pin.title.replace(/[^a-z0-9\s-_]/gi, '').trim() || 'image'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateAllImages = async () => {
        const readyPins = pins.filter(p => p.status === 'ready_for_generation');
        for (const pin of readyPins) { await handleGenerateImage(pin.id); }
    };

    const handleDownloadAll = () => {
        pins.filter(p => p.status === 'complete' && p.imageUrl).forEach(pin => handleDownload(pin.id));
    };

    const handleClearAll = () => { if (confirm('Clear all pins?')) setPins([]); };

    const handleExportCSV = () => {
        if (pins.length === 0) return;
        const headers = ['Title', 'Description', 'Tags', 'URL', 'Image URL', 'Status'];
        const rows = pins.map(pin => [
            `"${(pin.title || '').replace(/"/g, '""')}"`, `"${(pin.description || '').replace(/"/g, '""')}"`,
            `"${(pin.tags || []).join(', ')}"`, `"${pin.url}"`,
            `"${pin.imageUrl?.startsWith('data:') ? 'Base64' : (pin.imageUrl || '')}"`, `"${pin.status}"`
        ].join(','));
        const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pinterest-pins-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const readyCount = pins.filter(p => p.status === 'ready_for_generation').length;
    const completedCount = pins.filter(p => p.status === 'complete').length;

    return (
        <div className="flex h-[calc(100vh-80px)] -m-6">
            {/* Left Sidebar */}
            <InputSection onGeneratePrompts={handleGeneratePrompts} isProcessing={isProcessing} config={config} onConfigChange={updateConfig} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div
                    className="p-4 flex items-center justify-between"
                    style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}
                >
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                            <Sparkles className="w-5 h-5" style={{ color: 'var(--primary)' }} /> Generated Prompts & Pins
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{pins.length} pins • {readyCount} ready • {completedCount} complete</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={handleGenerateAllImages} disabled={readyCount === 0}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${readyCount > 0 ? '' : 'opacity-50 cursor-not-allowed'}`}
                            style={readyCount > 0 ? { background: 'var(--primary)', color: '#0F172A' } : { background: 'var(--card)', color: 'var(--muted)' }}>
                            <Image className="w-3.5 h-3.5" /> Create All Pins ({readyCount})
                        </button>
                        <button onClick={handleDownloadAll} disabled={completedCount === 0}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${completedCount > 0 ? '' : 'opacity-50 cursor-not-allowed'}`}
                            style={completedCount > 0 ? { background: 'var(--accent)', color: 'white' } : { background: 'var(--card)', color: 'var(--muted)' }}>
                            <Download className="w-3.5 h-3.5" /> Download All ({completedCount})
                        </button>
                        <button onClick={handleClearAll} disabled={pins.length === 0}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                            style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                            <Trash2 className="w-3.5 h-3.5" /> Clear All
                        </button>
                        <button onClick={() => setShowCSVEditor(true)} disabled={completedCount === 0}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${completedCount > 0 ? '' : 'opacity-50 cursor-not-allowed'}`}
                            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                            <Table className="w-3.5 h-3.5" /> View CSV Editor
                        </button>
                        <button onClick={handleExportCSV} disabled={pins.length === 0}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                            style={{ background: 'var(--accent)', color: 'white' }}>
                            <FileText className="w-3.5 h-3.5" /> Export CSV for Pinterest
                        </button>
                        {/* Enhanced Features Panel */}
                        {enhancedMode && (
                            <div className="p-4 rounded-lg border bg-emerald-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 border-emerald-200">
                                <h3 className="font-semibold text-emerald-800 dark:text-white mb-3">
                                    ✨ Enhanced Features Active
                                </h3>

                                {/* AI Model Selection */}
                                <div className="mb-4">
                                    <label className="text-sm font-medium mb-2 block dark:text-slate-300">AI Model for Content Generation</label>
                                    <select
                                        value={selectedContentModel}
                                        onChange={(e) => setSelectedContentModel(e.target.value)}
                                        className="w-full p-2 border rounded bg-white dark:bg-slate-700 dark:text-white dark:border-slate-500"
                                    >
                                        <optgroup label="── Replicate API ──">
                                            <option value="auto">Auto (GPT-4o → DeepSeek fallback)</option>
                                            <option value="deepseek-v3">DeepSeek V3-0324 (Top Open Model)</option>
                                            <option value="llama-4-scout">Llama 4 Scout (Meta Newest)</option>
                                            <option value="llama-3.1-405b">Llama 3.1 405B (Near GPT-4)</option>
                                            <option value="llama-3.3-70b">Llama 3.3 70B (Best Value Open)</option>
                                            <option value="mixtral-8x7b">Mixtral 8x7B (Fast + Smart)</option>
                                            <option value="chatgpt-4o">GPT-4o (Best Closed Model)</option>
                                            <option value="chatgpt-4o-mini">GPT-4o Mini (Fast + Affordable)</option>
                                        </optgroup>
                                        <optgroup label="── Gemini API ──">
                                            <option value="gemini-3.1-pro">Gemini 3.1 Pro (Latest)</option>
                                            <option value="gemini-3-flash">Gemini 3 Flash (Frontier Preview)</option>
                                            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Most Powerful)</option>
                                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Best Value) ⭐</option>
                                            <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Fastest)</option>
                                        </optgroup>
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                        Gemini models require a Google Gemini API key. Other models use your existing API credentials.
                                    </p>
                                </div>

                                {/* Image Provider */}
                                <div className="mb-4">
                                    <label className="text-sm font-medium mb-2 block dark:text-slate-300">Image Provider</label>
                                    <select
                                        value={imageProvider}
                                        onChange={(e) => setImageProvider(e.target.value as 'gemini' | 'replicate')}
                                        className="w-full p-2 border rounded bg-white dark:bg-slate-700 dark:text-white dark:border-slate-500"
                                    >
                                        <option value="gemini">Gemini (Imagen 4)</option>
                                        <option value="replicate">Replicate (Flux, SeeDream)</option>
                                    </select>
                                </div>

                                {/* Template Selection */}
                                <div>
                                    <label className="text-sm font-medium mb-2 block dark:text-slate-300">Pin Style Template</label>
                                    <select
                                        value={selectedTemplate}
                                        onChange={(e) => setSelectedTemplate(e.target.value)}
                                        className="w-full p-2 border rounded bg-white dark:bg-slate-700 dark:text-white dark:border-slate-500"
                                    >
                                        {SYSTEM_PIN_TEMPLATES.map(template => (
                                            <option key={template.id} value={template.id}>
                                                {template.name}
                                            </option>
                                        ))}
                                        {customTemplates.length > 0 && (
                                            <optgroup label="──── My Custom Styles ────">
                                                {customTemplates.map(template => (
                                                    <option key={template.id} value={template.id}>
                                                        {template.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                        {SYSTEM_PIN_TEMPLATES.length} niche-specific templates available
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Settings Button */}
                        <button onClick={() => setShowSettings(true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                            <Settings className="w-3.5 h-3.5" /> Settings
                        </button>
                    </div>
                </div>
                {/* ADD this Enhanced Mode toggle */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setEnhancedMode(!enhancedMode)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${enhancedMode
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                            }`}
                    >
                        {enhancedMode ? '🟩 Enhanced Mode' : '🟦 Classic Mode'}
                    </button>

                    {/* Your existing Settings button */}
                    <button onClick={() => setShowSettings(!showSettings)}>
                        <Settings />
                    </button>
                </div>

                {/* Pin Grid */}
                <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--background)' }}>
                    {pins.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--secondary)' }}>
                                    <Image className="w-10 h-10" style={{ color: 'var(--muted)' }} />
                                </div>
                                <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--foreground)' }}>No pins yet</h3>
                                <p className="max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
                                    Enter URLs on the left and click "Generate Prompts" to create Pinterest-optimized pins with AI.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {pins.map(pin => (
                                <PinCard key={pin.id} pin={pin} onUpdate={handleUpdatePin} onGenerateImage={handleGenerateImage}
                                    onRegenerateText={handleRegenerateText} onRecreate={handleRecreate} onDownload={handleDownload} onEditImage={handleEditImage} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CSV Editor Modal */}
            <CSVEditor isOpen={showCSVEditor} onClose={() => setShowCSVEditor(false)} pins={pins}
                csvSettings={{ ...csvSettings, imgbbApiKey }} />

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                customRules={textRules}
                imageRules={imageRules}
                defaultConfig={config}
                replicateApiKey={replicateApiKey}
                googleApiKey={googleApiKey}
                csvSettings={csvSettings}
                onSave={handleSaveSettings}
            />

            {/* Chat Assistant */}
            <ChatBot googleApiKey={googleApiKey} />
        </div>
    );
}

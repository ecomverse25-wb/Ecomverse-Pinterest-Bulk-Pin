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
import SettingsModal from '@/components/bulk-pin/SettingsModal';

const DEFAULT_TEXT_RULES = `You're a Pinterest content writer optimizing for maximum search visibility and clicks.
Write: 1. A Pinterest title (under 80 characters) starting with an emoji and including the main keyword
2. A Pinterest description (EXACTLY 3 sentences) that clearly summarizes the post
CRITICAL: Target Keyword must appear in the first sentence. Include 3-4 searchable SEO keywords naturally.`;

const DEFAULT_IMAGE_RULES = `Create a visual prompt for a high-converting, vibrant Pinterest pin.
1. IMAGE: High-quality, eye-catching, and contextually relevant
2. TYPOGRAPHY: Include the title "{title}" in a bold, readable font
3. STYLE: Creative, "Poster Style", colorful but professional.`;

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


    useEffect(() => {
        setGoogleApiKey(localStorage.getItem('pinverse_google_api_key') || '');
        setReplicateApiKey(localStorage.getItem('pinverse_replicate_api_key') || '');
        setImgbbApiKey(localStorage.getItem('pinverse_imgbb_api_key') || '');
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



    const handleSaveSettings = (newTextRules: string, newImageRules: string, newConfig: PinConfig, newReplicateKey: string, newGoogleKey: string, newCsvSettings: CSVSettings) => {
        setTextRules(newTextRules);
        setImageRules(newImageRules);
        setConfig(newConfig);
        setReplicateApiKey(newReplicateKey);
        setGoogleApiKey(newGoogleKey);
        setCsvSettings(newCsvSettings);
        setImgbbApiKey(newCsvSettings.imgbbApiKey);
        localStorage.setItem('pinverse_text_rules', newTextRules);
        localStorage.setItem('pinverse_image_rules', newImageRules);
        localStorage.setItem('pinverse_pin_config', JSON.stringify(newConfig));
        localStorage.setItem('pinverse_replicate_api_key', newReplicateKey);
        localStorage.setItem('pinverse_google_api_key', newGoogleKey);
        localStorage.setItem('pinverse_csv_settings', JSON.stringify(newCsvSettings));
        localStorage.setItem('pinverse_imgbb_api_key', newCsvSettings.imgbbApiKey);
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

                        {/* Settings Button */}
                        <button onClick={() => setShowSettings(true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                            <Settings className="w-3.5 h-3.5" /> Settings
                        </button>
                    </div>
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

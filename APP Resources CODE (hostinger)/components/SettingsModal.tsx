
import React, { useState, useEffect } from 'react';
import { PinConfig, PinStyle, AspectRatio, ImageModel, PostInterval, CSVSettings } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customRules: string;
    imageRules: string;
    defaultConfig: PinConfig;
    replicateApiKey: string;
    googleApiKey: string;
    csvSettings: CSVSettings;
    onSave: (rules: string, imageRules: string, config: PinConfig, replicateKey: string, googleKey: string, csvSettings: CSVSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, customRules, imageRules, defaultConfig, replicateApiKey, googleApiKey, csvSettings, onSave }) => {
    const [localTextRules, setLocalTextRules] = useState(customRules);
    const [localImageRules, setLocalImageRules] = useState(imageRules);
    const [localReplicateKey, setLocalReplicateKey] = useState(replicateApiKey);
    const [localGoogleKey, setLocalGoogleKey] = useState(googleApiKey);

    // Default Config State
    const [localStyle, setLocalStyle] = useState<PinStyle>(defaultConfig.style);
    const [localRatio, setLocalRatio] = useState<AspectRatio>(defaultConfig.ratio);
    const [localModel, setLocalModel] = useState<ImageModel>(defaultConfig.model);

    // CSV Settings State
    const [localImgbbKey, setLocalImgbbKey] = useState(csvSettings.imgbbApiKey);
    const [localPostInterval, setLocalPostInterval] = useState<PostInterval>(csvSettings.postInterval);
    const [localPinsPerDay, setLocalPinsPerDay] = useState(csvSettings.pinsPerDay);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Reset local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalTextRules(customRules);
            setLocalImageRules(imageRules);
            setLocalReplicateKey(replicateApiKey);
            setLocalGoogleKey(googleApiKey);
            setLocalStyle(defaultConfig.style);
            setLocalRatio(defaultConfig.ratio);
            setLocalModel(defaultConfig.model);
            setLocalImgbbKey(csvSettings.imgbbApiKey);
            setLocalPostInterval(csvSettings.postInterval);
            setLocalPinsPerDay(csvSettings.pinsPerDay);
            setSaveStatus('idle');
        }
    }, [isOpen, customRules, imageRules, defaultConfig, replicateApiKey, googleApiKey, csvSettings]);

    if (!isOpen) return null;

    const handleSave = () => {
        setSaveStatus('saving');

        // Simulate short delay for UX and visual confirmation
        setTimeout(() => {
            onSave(localTextRules, localImageRules, {
                style: localStyle,
                ratio: localRatio,
                model: localModel,
                contentType: 'article'
            }, localReplicateKey, localGoogleKey, {
                imgbbApiKey: localImgbbKey,
                postInterval: localPostInterval,
                pinsPerDay: localPinsPerDay
            });

            setSaveStatus('saved');

            setTimeout(() => {
                onClose();
            }, 750);
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Settings</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Configure your Ecomverse defaults and API keys</p>
                    </div>
                    <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* API Keys Section */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            API Credentials
                        </h3>
                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg p-4 space-y-4">

                            {/* Google API Key */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Google Gemini API Key (Required)</label>
                                <input
                                    type="password"
                                    value={localGoogleKey}
                                    onChange={(e) => setLocalGoogleKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="w-full bg-white dark:bg-slate-700 border border-orange-200 dark:border-orange-800/50 rounded p-2 text-xs text-gray-700 dark:text-white focus:ring-1 focus:ring-orange-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Used for generating text, pin details, and Gemini images.</p>
                            </div>

                            {/* Replicate API Key */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Replicate API Token (Optional)</label>
                                <input
                                    type="password"
                                    value={localReplicateKey}
                                    onChange={(e) => setLocalReplicateKey(e.target.value)}
                                    placeholder="r8_..."
                                    className="w-full bg-white dark:bg-slate-700 border border-orange-200 dark:border-orange-800/50 rounded p-2 text-xs text-gray-700 dark:text-white focus:ring-1 focus:ring-orange-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Required ONLY for Flux, Ideogram, and SDXL models.</p>
                            </div>

                        </div>
                    </div>

                    {/* Section 1: Default Config */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            Configuration Defaults
                        </h3>
                        <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Default Pin Style</label>
                                <select
                                    value={localStyle}
                                    onChange={(e) => setLocalStyle(e.target.value as PinStyle)}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-xs rounded-md p-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="basic_top">Basic - Text at Top</option>
                                    <option value="basic_middle">Basic - Text at Middle</option>
                                    <option value="basic_bottom">Basic - Text at Bottom</option>
                                    <option value="collage">Collage</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Default Aspect Ratio</label>
                                <select
                                    value={localRatio}
                                    onChange={(e) => setLocalRatio(e.target.value as AspectRatio)}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-xs rounded-md p-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="9:16">9:16 (Standard)</option>
                                    <option value="2:3">2:3 (Classic)</option>
                                    <option value="1:2">1:2 (Tall)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Default Image Model</label>
                                <select
                                    value={localModel}
                                    onChange={(e) => setLocalModel(e.target.value as ImageModel)}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-xs rounded-md p-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
                                    <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
                                    <option value="imagen-4.0-generate-001">Imagen 3</option>
                                    <option value="ideogram">Ideogram (Replicate)</option>
                                    <option value="flux-schnell">Flux Schnell (Replicate)</option>
                                    <option value="flux-dev">Flux Dev (Replicate)</option>
                                    <option value="sdxl-turbo">SDXL Turbo (Replicate)</option>
                                    <option value="seedream4">SeeDream4 (Replicate)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Text Rules */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Title & Description Rules (ChatGPT 5 Style)
                        </h3>
                        <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Customize how the AI generates Titles and Descriptions.
                            </p>
                            <textarea
                                value={localTextRules}
                                onChange={(e) => setLocalTextRules(e.target.value)}
                                className="w-full h-32 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded p-3 text-xs font-mono text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Section 3: Image Rules */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Image Prompting Rules
                        </h3>
                        <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Instructions for generating the Visual Image Prompt (e.g. "Always include bright colors", "Use photorealistic style").
                            </p>
                            <textarea
                                value={localImageRules}
                                onChange={(e) => setLocalImageRules(e.target.value)}
                                className="w-full h-32 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded p-3 text-xs font-mono text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                                placeholder="e.g. Ensure all images have high contrast. Avoid using cartoon styles..."
                            />
                        </div>
                    </div>

                    {/* Section 4: CSV & Scheduling Options */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            CSV & Scheduling Options
                        </h3>
                        <div className="bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/30 rounded-lg p-4 space-y-4">

                            {/* ImgBB API Key */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ImgBB API Key (Optional)</label>
                                <input
                                    type="password"
                                    value={localImgbbKey}
                                    onChange={(e) => setLocalImgbbKey(e.target.value)}
                                    placeholder="b80aeb48f4248d948ba2be1605046d6c"
                                    className="w-full bg-white dark:bg-slate-700 border border-pink-200 dark:border-pink-800/50 rounded p-2 text-xs text-gray-700 dark:text-white focus:ring-1 focus:ring-pink-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                    <strong>Enable Image Hosting:</strong> Add your ImgBB API Key to automatically upload generated images and include direct URLs in your CSV export.
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    Get a free API Key: <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-pink-600 dark:text-pink-400 underline hover:text-pink-700">Get ImgBB API Key (100% free, no limits!)</a>
                                </p>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                                    <strong>Benefit:</strong> Images hosted on ImgBB CDN forever, perfect for bulk Pinterest uploading!
                                </p>
                            </div>

                            {/* Post Interval */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Post Interval (minutes)</label>
                                <select
                                    value={localPostInterval}
                                    onChange={(e) => setLocalPostInterval(e.target.value as PostInterval)}
                                    className="w-full bg-white dark:bg-slate-700 border border-pink-200 dark:border-pink-800/50 rounded p-2 text-xs text-gray-700 dark:text-white focus:ring-1 focus:ring-pink-500 outline-none"
                                >
                                    <option value="30">Every 30 minutes</option>
                                    <option value="60">Every 1 hour</option>
                                    <option value="120">Every 2 hours</option>
                                    <option value="180">Every 3 hours</option>
                                </select>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                    Set how often pins should be scheduled when using auto-increment in CSV editor.
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    <strong>Example:</strong> 30 minutes = 08:00, 08:30, 09:00, 09:30...
                                </p>
                            </div>

                            {/* Pins Per Day */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Pins Per Day</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={localPinsPerDay}
                                    onChange={(e) => setLocalPinsPerDay(Math.max(1, Math.min(50, parseInt(e.target.value) || 15)))}
                                    className="w-full bg-white dark:bg-slate-700 border border-pink-200 dark:border-pink-800/50 rounded p-2 text-xs text-gray-700 dark:text-white focus:ring-1 focus:ring-pink-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                    Maximum number of pins to schedule per day in CSV editor.
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    <strong>Example:</strong> Set to 15 = only 15 time slots per day, then moves to next day. This helps you schedule consistently without overwhelming your Pinterest account.
                                </p>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        disabled={saveStatus !== 'idle'}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saveStatus !== 'idle'}
                        className={`px-6 py-2 text-sm font-bold rounded-lg shadow-sm transition-all flex items-center justify-center min-w-[140px]
                    ${saveStatus === 'saved' ? 'bg-green-500 text-white' :
                                saveStatus === 'saving' ? 'bg-emerald-400 text-white cursor-wait' :
                                    'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                    >
                        {saveStatus === 'saved' ? (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Saved!
                            </>
                        ) : saveStatus === 'saving' ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Saving...
                            </>
                        ) : (
                            "Save Settings"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

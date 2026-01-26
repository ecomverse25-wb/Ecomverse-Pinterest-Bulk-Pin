
import React, { useState, useEffect } from 'react';
import InputSection from './components/InputSection';
import PinCard from './components/PinCard';
import SettingsModal from './components/SettingsModal';
import LicenseModal from './components/LicenseModal';
import ChatBot from './components/ChatBot';
import AdminPanel from './components/AdminPanel';
import { PinData, PinConfig } from './types';
import { generatePinDetails, generatePinImage, regeneratePinText, editPinImage } from './services/geminiService';

const App: React.FC = () => {
  const [pins, setPins] = useState<PinData[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLicensed, setIsLicensed] = useState(false);

  // API Keys State - Loaded from localStorage
  const [googleApiKey, setGoogleApiKey] = useState(() => localStorage.getItem('ecomverse_google_key') || '');
  const [replicateApiKey, setReplicateApiKey] = useState(() => localStorage.getItem('ecomverse_replicate_key') || '');

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('ecomverse_theme') === 'dark';
  });

  // Apply Theme Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ecomverse_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ecomverse_theme', 'light');
    }
  }, [darkMode]);

  // Custom Rules State
  const [textPromptRules, setTextPromptRules] = useState(() => localStorage.getItem('ecomverse_text_rules_v3') || `You're a Pinterest content writer optimizing blog posts and product page for maximum search visibility and clicks.

For this blog post product page URL, write:
1. A Pinterest title (under 80 characters) that starts with an emoji and includes the main keyword
2. A Pinterest description (EXACTLY 3 sentences, NO MORE) that clearly summarizes the post

CRITICAL RULES FOR DESCRIPTION:
- EXACTLY 3 sentences (not 4, not 5, just 3)
- Target Keyword must appear in the first sentence
- Include 3-4 searchable SEO keywords (annotations) naturally in the text
- DO NOT use asterisks (**) or bolding for keywords. Write them as normal text.
- Be concise and punchy - every word must count
- Focus on benefits and what readers will learn/get
- Keywords should flow naturally, not feel forced

Blog post URL: \${url}\${interestsNote}

Format your response EXACTLY like this example:

🥗 Vegan Buddha Bowl – Clean, Colorful, and Fully Customizable

This vegan Buddha bowl is packed with plant-based ingredients, quinoa, and roasted vegetables. Perfect for meal prep or a quick healthy lunch. Customizable, colorful, and delicious!

Generate the title and description now (remember: EXACTLY 3 sentences):`);

  const [imagePromptRules, setImagePromptRules] = useState(() => localStorage.getItem('ecomverse_image_rules_v3') || `Create a visual prompt for a high-converting, vibrant Pinterest pin.

1. IMAGE: High-quality, eye-catching, and contextually relevant to the content. Use dynamic angles and rich colors.
2. TYPOGRAPHY: Include the title "{title}" in a bold, readable, professional font. 
3. STYLE: Creative, "Poster Style", or "Editorial". It can be colorful and fun, but must remain professional.

CRITICAL TEXT RULES (DO NOT IGNORE):
- The title text must appear EXACTLY ONCE as a headline or overlay.
- DO NOT repeat the words.
- DO NOT create a "word cloud" or "collage of text".
- DO NOT use random stickers containing text.
- The rest of the image should be visual elements (photos, graphics, colors), NOT text.`);

  // Default Config State
  const [defaultPinConfig, setDefaultPinConfig] = useState<PinConfig>(() => {
    const saved = localStorage.getItem('ecomverse_pin_config');
    return saved ? JSON.parse(saved) : {
      style: 'basic_bottom',
      ratio: '9:16',
      model: 'gemini-2.5-flash-image',
      contentType: 'article',
      websiteUrl: '',
      referenceImages: [],
      imageSize: '1K',

      // Logo Defaults
      logoData: undefined,
      logoPosition: 'bottom-right',
      logoSize: 20,

      // CTA Defaults
      ctaText: '',
      ctaColor: '#E60023',
      ctaTextColor: '#FFFFFF',
      ctaPosition: 'bottom-center'
    };
  });

  // Check for License
  useEffect(() => {
    const licensed = localStorage.getItem('ecomverse_license_active') === 'true';
    if (licensed) {
      setIsLicensed(true);
    }
  }, []);

  const handleActivation = (newGoogleKey: string, newReplicateKey: string) => {
    setGoogleApiKey(newGoogleKey);
    setReplicateApiKey(newReplicateKey);
    setIsLicensed(true);
  };

  const handleSaveSettings = (newTextRules: string, newImageRules: string, newConfig: PinConfig, newReplicateKey: string, newGoogleKey: string) => {
    setTextPromptRules(newTextRules);
    setImagePromptRules(newImageRules);
    setDefaultPinConfig(newConfig);
    setReplicateApiKey(newReplicateKey);
    setGoogleApiKey(newGoogleKey);

    // Save settings to localStorage
    localStorage.setItem('ecomverse_text_rules_v3', newTextRules);
    localStorage.setItem('ecomverse_image_rules_v3', newImageRules);
    localStorage.setItem('ecomverse_pin_config', JSON.stringify(newConfig));
    localStorage.setItem('ecomverse_replicate_key', newReplicateKey);
    localStorage.setItem('ecomverse_google_key', newGoogleKey);
  };

  // Step 1: Initialize items from URLs and Analyze content (Generate Prompts & Text)
  const handleGeneratePrompts = async (urls: string[], config: PinConfig) => {
    if (!googleApiKey) {
      alert("Google API Key is missing. Please add it in Settings.");
      setIsSettingsOpen(true);
      return;
    }

    setGlobalLoading(true);

    // Create initial placeholders
    const newPins: PinData[] = urls.map(url => ({
      id: Math.random().toString(36).substr(2, 9),
      url,
      status: 'analyzing',
      targetKeyword: '',
      annotatedInterests: '',
      visualPrompt: '',
      title: '',
      description: '',
      tags: [],
      config: config // Store config per pin
    }));

    setPins(prev => [...newPins, ...prev]); // Prepend new items

    // Process analysis in parallel
    for (const pin of newPins) {
      try {
        const details = await generatePinDetails(pin.url, pin.config, textPromptRules, imagePromptRules, '', '', googleApiKey);

        setPins(currentPins => currentPins.map(p => {
          if (p.id === pin.id) {
            return {
              ...p,
              status: 'ready_for_generation',
              targetKeyword: details.targetKeyword || '',
              visualPrompt: details.visualPrompt,
              title: details.title,
              description: details.description,
              tags: details.tags
            };
          }
          return p;
        }));
      } catch (e) {
        setPins(currentPins => currentPins.map(p => {
          if (p.id === pin.id) return { ...p, status: 'error', error: 'Failed to analyze URL' };
          return p;
        }));
      }
    }
    setGlobalLoading(false);
  };

  // Recreate Entire Pin (Reset to Analyzing -> Generate Details)
  const handleRecreatePin = async (id: string) => {
    const pin = pins.find(p => p.id === id);
    if (!pin) return;
    if (!googleApiKey) return;

    // Reset status to analyzing and clear previous image
    handleUpdatePin(id, {
      status: 'analyzing',
      error: undefined,
      imageUrl: undefined
    });

    try {
      const details = await generatePinDetails(pin.url, pin.config, textPromptRules, imagePromptRules, '', '', googleApiKey);

      handleUpdatePin(id, {
        status: 'ready_for_generation',
        targetKeyword: details.targetKeyword || '',
        visualPrompt: details.visualPrompt,
        title: details.title,
        description: details.description,
        tags: details.tags
      });
    } catch (e) {
      handleUpdatePin(id, { status: 'error', error: 'Failed to recreate pin details' });
    }
  };

  // Regenerate Text only (Title/Desc) based on keyword updates
  const handleRegenerateText = async (id: string) => {
    const pin = pins.find(p => p.id === id);
    if (!pin) return;
    if (!googleApiKey) return;

    try {
      const details = await regeneratePinText(
        pin.url,
        pin.targetKeyword,
        pin.annotatedInterests,
        textPromptRules,
        imagePromptRules,
        googleApiKey
      );
      handleUpdatePin(id, {
        title: details.title,
        description: details.description,
        tags: details.tags,
        visualPrompt: details.visualPrompt || pin.visualPrompt
      });
    } catch (e) {
      console.error("Failed to regenerate text", e);
    }
  };

  // Helper to update individual pin
  const handleUpdatePin = (id: string, data: Partial<PinData>) => {
    setPins(currentPins => currentPins.map(p => {
      if (p.id === id) return { ...p, ...data };
      return p;
    }));
  };

  // Step 3: Generate Images for all ready pins (Bulk)
  const handleGenerateAllImages = async () => {
    const pinsToGenerate = pins.filter(p => p.status === 'ready_for_generation' || p.status === 'error');
    if (pinsToGenerate.length === 0) return;

    // Update status to loading
    setPins(currentPins => currentPins.map(p => {
      if (p.status === 'ready_for_generation' || p.status === 'error') {
        return { ...p, status: 'generating_image', error: undefined };
      }
      return p;
    }));

    // Process images
    await Promise.all(pinsToGenerate.map(async (pin) => {
      await generateSingleImage(pin.id, pin.visualPrompt, pin.config);
    }));
  };

  // Generate Single Image
  const generateSingleImage = async (id: string, prompt: string, config: PinConfig) => {
    // Ensure status is generating
    handleUpdatePin(id, { status: 'generating_image', error: undefined });

    try {
      const imageUrl = await generatePinImage(prompt, config, googleApiKey, replicateApiKey);
      handleUpdatePin(id, { status: 'complete', imageUrl });
    } catch (e: any) {
      handleUpdatePin(id, { status: 'error', error: e.message || 'Image generation failed' });
    }
  };

  // Edit Image Function
  const handleEditImage = async (id: string, prompt: string) => {
    const pin = pins.find(p => p.id === id);
    if (!pin || !pin.imageUrl) return;
    if (!googleApiKey) return;

    try {
      const newImageUrl = await editPinImage(pin.imageUrl, prompt, googleApiKey);
      handleUpdatePin(id, { imageUrl: newImageUrl });
    } catch (e: any) {
      console.error("Edit failed", e);
      throw e; // Rethrow to be caught by component if needed
    }
  };

  // Step 4: Download All
  const handleDownloadAll = () => {
    const completedPins = pins.filter(p => p.imageUrl && p.status === 'complete');
    if (completedPins.length === 0) return;

    completedPins.forEach((pin, index) => {
      handleDownloadSingle(pin.id);
    });
  };

  // Download Single
  const handleDownloadSingle = (id: string) => {
    const pin = pins.find(p => p.id === id);
    if (!pin || !pin.imageUrl) return;

    const link = document.createElement('a');
    link.href = pin.imageUrl;

    // Clean filename from title: "Title.png"
    // Remove invalid characters, trim, and replace spaces with single space
    let safeTitle = pin.title
      .replace(/[^a-z0-9\s-_]/gi, '')
      .trim()
      .replace(/\s+/g, ' ');

    if (!safeTitle) safeTitle = "image";

    // Determine extension based on mime type or default
    let extension = 'png';
    if (pin.imageUrl.startsWith('data:image/jpeg') || pin.imageUrl.includes('.jpg') || pin.imageUrl.includes('.jpeg')) {
      extension = 'jpg';
    }

    link.download = `${safeTitle}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV (Improved)
  const handleExportCSV = () => {
    if (pins.length === 0) return;

    const headers = [
      'ID',
      'Status',
      'URL',
      'Content Type',
      'Target Keyword',
      'Title',
      'Description',
      'Tags',
      'Visual Prompt',
      'Annotated Interests',
      'Image URL Link', // Clarified this is not raw data
      'Pin Style',
      'Aspect Ratio',
      'Model',
      'Website URL'
    ];

    // Helper to remove newlines/tabs that break CSVs
    const cleanText = (text: string | undefined | null) => {
      if (!text) return '';
      // Replace newlines and tabs with a single space
      return String(text).replace(/[\r\n\t]+/g, ' ').trim();
    };

    const escapeCsvField = (field: string | undefined | null) => {
      const cleaned = cleanText(field);
      // Escape double quotes by doubling them
      return `"${cleaned.replace(/"/g, '""')}"`;
    };

    const csvRows = pins.map(pin => {
      // Prevent massive Base64 strings from breaking the CSV
      let imageUrl = pin.imageUrl || '';
      if (imageUrl.startsWith('data:')) {
        imageUrl = 'Base64 Image Data (Too large for CSV - Use Download All)';
      }

      return [
        escapeCsvField(pin.id),
        escapeCsvField(pin.status),
        escapeCsvField(pin.url),
        escapeCsvField(pin.config?.contentType),
        escapeCsvField(pin.targetKeyword),
        escapeCsvField(pin.title),
        escapeCsvField(pin.description),
        escapeCsvField(pin.tags?.join(', ')),
        escapeCsvField(pin.visualPrompt),
        escapeCsvField(pin.annotatedInterests),
        escapeCsvField(imageUrl),
        escapeCsvField(pin.config?.style),
        escapeCsvField(pin.config?.ratio),
        escapeCsvField(pin.config?.model),
        escapeCsvField(pin.config?.websiteUrl)
      ].join(',');
    });

    // Add BOM for Excel UTF-8 compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute('href', url);
    link.setAttribute('download', `pinterest-pins-export-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Clear All Pins Function
  const handleClearAllPins = () => {
    if (pins.length === 0) return;
    setPins([]);
  };

  const completedCount = pins.filter(p => p.status === 'complete').length;
  const readyCount = pins.filter(p => p.status === 'ready_for_generation').length;

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 transition-colors">
      {!isLicensed && <LicenseModal onActivate={handleActivation} onOpenAdmin={() => setIsAdminOpen(true)} />}

      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        customRules={textPromptRules}
        imageRules={imagePromptRules}
        defaultConfig={defaultPinConfig}
        replicateApiKey={replicateApiKey}
        googleApiKey={googleApiKey}
        onSave={handleSaveSettings}
      />

      <ChatBot googleApiKey={googleApiKey} />

      {/* Header */}
      <header className="h-16 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shrink-0 z-10 shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.reload()}>
            {/* EV Icon */}
            <div className="flex items-center h-10 select-none">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">E</span>
              <div className="w-0.5 h-6 bg-slate-900 dark:bg-white mx-1"></div>
              <span className="text-3xl font-black text-yellow-400 tracking-tighter">V</span>
            </div>

            {/* Text */}
            <div className="flex flex-col justify-center -space-y-1 select-none">
              <div className="flex text-lg font-bold tracking-tight">
                <span className="text-slate-900 dark:text-white">ECOM</span>
                <span className="text-yellow-400">VERSE</span>
              </div>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium tracking-widest uppercase">Pinterest Automation</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setDarkMode(false)}
              className={`px-3 py-1.5 rounded-md shadow-sm text-xs font-medium flex items-center gap-1 transition-colors
                     ${!darkMode ? 'bg-white text-gray-800' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Light
            </button>
            <button
              onClick={() => setDarkMode(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                     ${darkMode ? 'bg-slate-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
            >
              Dark
            </button>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <InputSection
          onGeneratePrompts={handleGeneratePrompts}
          isProcessing={globalLoading}
          initialConfig={defaultPinConfig}
        />

        {/* Right Area */}
        <main className="flex-1 bg-gray-50 dark:bg-slate-950 flex flex-col overflow-hidden transition-colors">
          {/* Action Bar */}
          <div className="px-8 py-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Generated Prompts & Pins</h2>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 xl:pb-0">
              <button
                onClick={handleGenerateAllImages}
                disabled={readyCount === 0}
                className={`px-4 py-2 rounded-md text-sm font-medium shadow-sm flex items-center gap-2 text-white transition-colors whitespace-nowrap
                            ${readyCount > 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Create All Pins
              </button>

              <button
                onClick={handleDownloadAll}
                disabled={completedCount === 0}
                className={`px-4 py-2 rounded-md text-sm font-medium shadow-sm flex items-center gap-2 text-white transition-colors whitespace-nowrap
                            ${completedCount > 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download All Images
              </button>

              <button
                onClick={handleClearAllPins}
                disabled={pins.length === 0}
                className={`px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 rounded-md text-sm font-medium shadow-sm flex items-center gap-2 text-red-600 dark:text-red-400 transition-colors whitespace-nowrap
                            ${pins.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Clear All
              </button>

              <button
                onClick={handleExportCSV}
                disabled={pins.length === 0}
                className={`px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium shadow-sm flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            {pins.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-600">
                <div className="mb-6 opacity-20">
                  <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-400 dark:text-slate-500">Enter URLs above to generate Pinterest pin prompts</h3>
                <div className="mt-8">
                  <svg className="w-12 h-12 text-gray-200 dark:text-slate-700 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {pins.map(pin => (
                  <div key={pin.id} className="h-full">
                    <PinCard
                      pin={pin}
                      onUpdate={handleUpdatePin}
                      onGenerateImage={(id) => generateSingleImage(id, pin.visualPrompt, pin.config)}
                      onRecreate={() => handleRecreatePin(pin.id)}
                      onRegenerateText={() => handleRegenerateText(pin.id)}
                      onDownload={handleDownloadSingle}
                      onEditImage={handleEditImage}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;


import React, { useState, useEffect, useRef } from 'react';
import { PinConfig, PinStyle, AspectRatio, ImageModel, ContentType, ImageSize, LogoPosition } from '../types';

interface InputSectionProps {
  onGeneratePrompts: (urls: string[], config: PinConfig) => void;
  isProcessing: boolean;
  initialConfig: PinConfig;
}

const InputSection: React.FC<InputSectionProps> = ({ onGeneratePrompts, isProcessing, initialConfig }) => {
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Config State initialized from props
  const [pinStyle, setPinStyle] = useState<PinStyle>(initialConfig.style);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialConfig.ratio);
  const [imageModel, setImageModel] = useState<ImageModel>(initialConfig.model);
  const [contentType, setContentType] = useState<ContentType>(initialConfig.contentType || 'article');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [imageSize, setImageSize] = useState<ImageSize>(initialConfig.imageSize || '1K');
  
  // Branding / Logo State
  const [logoData, setLogoData] = useState<string | undefined>(initialConfig.logoData);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>(initialConfig.logoPosition || 'bottom-right');
  const [logoSize, setLogoSize] = useState<number>(initialConfig.logoSize || 20);

  // CTA State
  const [ctaText, setCtaText] = useState<string>(initialConfig.ctaText || '');
  const [ctaColor, setCtaColor] = useState<string>(initialConfig.ctaColor || '#E60023');
  const [ctaTextColor, setCtaTextColor] = useState<string>(initialConfig.ctaTextColor || '#FFFFFF');
  const [ctaPosition, setCtaPosition] = useState<LogoPosition>(initialConfig.ctaPosition || 'bottom-center');

  // Multiple Reference Images State
  const [referenceImages, setReferenceImages] = useState<string[]>(initialConfig.referenceImages || []);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Update local state if initialConfig changes
  useEffect(() => {
    setPinStyle(initialConfig.style);
    setAspectRatio(initialConfig.ratio);
    setImageModel(initialConfig.model);
    if (initialConfig.contentType) setContentType(initialConfig.contentType);
    if (initialConfig.referenceImages) setReferenceImages(initialConfig.referenceImages);
    if (initialConfig.imageSize) setImageSize(initialConfig.imageSize);
    
    // Branding
    if (initialConfig.logoData) setLogoData(initialConfig.logoData);
    if (initialConfig.logoPosition) setLogoPosition(initialConfig.logoPosition);
    if (initialConfig.logoSize) setLogoSize(initialConfig.logoSize);

    // CTA
    if (initialConfig.ctaText) setCtaText(initialConfig.ctaText);
    if (initialConfig.ctaColor) setCtaColor(initialConfig.ctaColor);
    if (initialConfig.ctaTextColor) setCtaTextColor(initialConfig.ctaTextColor);
    if (initialConfig.ctaPosition) setCtaPosition(initialConfig.ctaPosition);
  }, [initialConfig]);

  const handleGenerate = () => {
    if (!inputText.trim()) return;
    const urls = inputText.split('\n').filter(line => line.trim().length > 0);
    onGeneratePrompts(urls, {
        style: pinStyle,
        ratio: aspectRatio,
        model: imageModel,
        contentType: contentType,
        websiteUrl: websiteUrl.trim(),
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        imageSize: imageModel === 'gemini-3-pro-image-preview' ? imageSize : undefined,
        logoData: logoData,
        logoPosition: logoPosition,
        logoSize: logoSize,
        ctaText: ctaText.trim(),
        ctaColor: ctaColor,
        ctaTextColor: ctaTextColor,
        ctaPosition: ctaPosition
    });
  };

  const handleClear = () => {
    setInputText('');
    setReferenceImages([]);
    setImageUrlInput('');
    setCtaText('');
  };

  const handleLoadSample = () => {
      setInputText(
        contentType === 'product' 
        ? 'https://www.amazon.com/dp/B08H734WGB\nhttps://www.nike.com/t/air-force-1-07-mens-shoes-5QFp5Z'
        : 'https://www.healthline.com/nutrition/meal-prep-ideas\nhttps://www.budgetbytes.com/chicken-lime-soup'
      );
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const lines = content
            .split(/\r?\n/)
            .map(line => line.trim().replace(/^["']|["']$/g, ''))
            .filter(line => line.length > 0);

        if (lines.length > 0) {
            setInputText(prev => {
                const separator = prev.trim() ? '\n' : '';
                return prev.trim() + separator + lines.join('\n');
            });
        }
      }
    };
    reader.readAsText(file);
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
                  setReferenceImages(prev => [...prev, result]);
              }
          };
          reader.readAsDataURL(file);
      });
      event.target.value = '';
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if(!file) return;
      if(file.size > 2 * 1024 * 1024) {
          alert("Logo too large. Please use a file under 2MB.");
          return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
          if(e.target?.result) setLogoData(e.target.result as string);
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
                 setReferenceImages(prev => [...prev, reader.result as string]);
                 setImageUrlInput('');
              }
              setIsLoadingUrl(false);
          };
          reader.readAsDataURL(blob);
      } catch (e) {
          alert("Could not load image from URL directly. This is likely due to security restrictions (CORS) on the target website. Please download the image and upload it manually.");
          setIsLoadingUrl(false);
      }
  };

  const removeReferenceImage = (index: number) => {
      setReferenceImages(prev => prev.filter((_, i) => i !== index));
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
    <div className="w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 p-5 flex flex-col h-full shrink-0 overflow-y-auto transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold text-gray-800 dark:text-white">Pin Configuration</h2>
        <div className="flex gap-2">
             <button 
                onClick={handleClear}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded transition-colors"
            >
                Clear
            </button>
        </div>
      </div>
      
      {/* Content Type Selector */}
      <div className="mb-6 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg flex">
          <button 
             onClick={() => setContentType('article')}
             className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${contentType === 'article' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
             Standard Post
          </button>
          <button 
             onClick={() => setContentType('product')}
             className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${contentType === 'product' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
             Product
          </button>
      </div>

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
            {contentType === 'product' ? 'Product URLs' : 'Article URLs'}
        </h2>
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt,.csv"
            />
            <button 
                onClick={handleImportClick}
                className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
                Import List
            </button>
        </div>
      </div>

      <div className="relative mb-6">
        <textarea
            className="w-full h-40 border border-gray-300 dark:border-slate-700 rounded-lg p-3 text-xs font-mono text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none bg-gray-50 dark:bg-slate-800"
            placeholder={contentType === 'product' ? "https://amazon.com/dp/..." : "https://yourdomain.com/post-1"}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessing}
        />
        {!inputText && (
            <div className="absolute top-3 left-3 right-3 bottom-3 pointer-events-none opacity-40 text-xs text-gray-500 dark:text-slate-400">
                {contentType === 'product' ? (
                    <>
                    https://myshop.com/products/running-shoes<br/>
                    https://amazon.com/dp/B08X...
                    </>
                ) : (
                    <>
                    https://yourdomain.com/healthy-recipes<br/>
                    https://yourdomain.com/travel-guide
                    </>
                )}
            </div>
        )}
      </div>

      {/* Branding / Logo Section */}
      <div className="mb-4 border-t border-gray-100 dark:border-slate-800 pt-5">
         <div className="flex justify-between items-center mb-3">
             <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                Logo Overlay
             </label>
             {logoData && (
                 <button onClick={() => setLogoData(undefined)} className="text-[10px] text-red-500 hover:text-red-700">Remove</button>
             )}
         </div>

         <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
             {/* Upload Area */}
             {!logoData ? (
                 <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full h-12 border border-dashed border-gray-300 dark:border-slate-600 rounded flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 text-[10px] transition-colors"
                 >
                    + Upload Logo (PNG)
                 </div>
             ) : (
                 <div className="flex items-center gap-3">
                     <div className="w-10 h-10 border border-gray-200 dark:border-slate-600 rounded bg-white/50 flex items-center justify-center p-1">
                         <img src={logoData} alt="Logo" className="max-w-full max-h-full object-contain" />
                     </div>
                     <div className="flex-1 text-[10px] text-gray-500">
                         Logo loaded
                     </div>
                 </div>
             )}
             <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/png,image/jpeg" className="hidden" />

             {logoData && (
                 <>
                    {/* Position */}
                    <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 mb-1">Position</label>
                        <select 
                            value={logoPosition}
                            onChange={(e) => setLogoPosition(e.target.value as LogoPosition)}
                            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-xs rounded p-1.5 focus:ring-1 focus:ring-pink-500 outline-none"
                        >
                            {positionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>

                    {/* Size Slider */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400">Size</label>
                            <span className="text-[9px] text-gray-400">{logoSize}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="10" 
                            max="60" 
                            step="5"
                            value={logoSize}
                            onChange={(e) => setLogoSize(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                    </div>
                 </>
             )}
         </div>
      </div>

      {/* CTA Button Section */}
      <div className="mb-6 border-t border-gray-100 dark:border-slate-800 pt-5">
         <div className="flex justify-between items-center mb-3">
             <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                Call to Action (CTA)
             </label>
         </div>

         <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
             {/* CTA Text */}
             <div>
                <label className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 mb-1">Button Text</label>
                <input 
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. Shop Now, Read More"
                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-xs rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                />
             </div>

             {ctaText && (
                 <>
                    {/* Colors Row */}
                    <div className="flex gap-4">
                         <div className="flex-1">
                            <label className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 mb-1">Button Color</label>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="color"
                                    value={ctaColor}
                                    onChange={(e) => setCtaColor(e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                />
                                <span className="text-[10px] font-mono text-gray-400">{ctaColor}</span>
                            </div>
                         </div>
                         <div className="flex-1">
                            <label className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 mb-1">Text Color</label>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="color"
                                    value={ctaTextColor}
                                    onChange={(e) => setCtaTextColor(e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                />
                                <span className="text-[10px] font-mono text-gray-400">{ctaTextColor}</span>
                            </div>
                         </div>
                    </div>

                    {/* Position */}
                    <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 mb-1">Position</label>
                        <select 
                            value={ctaPosition}
                            onChange={(e) => setCtaPosition(e.target.value as LogoPosition)}
                            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-xs rounded p-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                             {positionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                 </>
             )}
         </div>
      </div>

      {/* Reference Image Section */}
      <div className="mb-6">
         <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Reference Assets <span className="text-gray-400 font-normal normal-case">(Optional)</span>
            </label>
         </div>

         {/* 1. Add URL Input */}
         <div className="flex gap-2 mb-3">
             <input 
                type="text" 
                value={imageUrlInput} 
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Paste Image Link..."
                className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-gray-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
             />
             <button 
                onClick={handleAddImageUrl}
                disabled={isLoadingUrl || !imageUrlInput}
                className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
             >
                 {isLoadingUrl ? '...' : 'Add'}
             </button>
         </div>
         
         {/* 2. Upload Box */}
         <input 
            type="file"
            ref={refImageInputRef}
            onChange={handleReferenceImagesUpload}
            className="hidden"
            accept="image/*"
            multiple
         />
         <div 
            onClick={() => refImageInputRef.current?.click()}
            className="w-full h-16 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors mb-3"
         >
             <div className="flex items-center gap-1 text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-[10px]">Upload Files</span>
             </div>
         </div>

         {/* 3. Image Grid */}
         {referenceImages.length > 0 && (
             <div className="grid grid-cols-3 gap-2">
                 {referenceImages.map((img, idx) => (
                     <div key={idx} className="relative aspect-square bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 overflow-hidden group">
                         <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                         <button 
                            onClick={() => removeReferenceImage(idx)}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                         </button>
                     </div>
                 ))}
             </div>
         )}
      </div>

      <div className="space-y-5 flex-1 border-t border-gray-100 dark:border-slate-800 pt-5">
        {/* Pin Style */}
        <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Pin Style:</label>
            <div className="relative">
                <select 
                    value={pinStyle}
                    onChange={(e) => setPinStyle(e.target.value as PinStyle)}
                    className="w-full appearance-none bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 pr-8"
                    disabled={isProcessing}
                >
                    <option value="basic_top">Basic - Text at Top</option>
                    <option value="basic_middle">Basic - Text at Middle</option>
                    <option value="basic_bottom">Basic - Text at Bottom</option>
                    <option value="collage">Collage - Multiple Images</option>
                    <option value="custom">Custom - Your Brand Guidelines</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>

        {/* Aspect Ratio */}
        <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Aspect Ratio:</label>
             <div className="relative">
                <select 
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="w-full appearance-none bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 pr-8"
                    disabled={isProcessing}
                >
                    <option value="9:16">9:16 - Standard Pinterest (Recommended)</option>
                    <option value="2:3">2:3 - Classic Portrait</option>
                    <option value="1:2">1:2 - Tall Pin</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>

        {/* Image Model */}
        <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Image Model:</label>
             <div className="relative">
                <select 
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value as ImageModel)}
                    className="w-full appearance-none bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 pr-8"
                    disabled={isProcessing}
                >
                    <optgroup label="Google">
                        <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fastest)</option>
                        <option value="gemini-3-pro-image-preview">Nano Banana Pro (High Res)</option>
                        <option value="imagen-4.0-generate-001">Google Imagen 3 (High Quality)</option>
                    </optgroup>
                    <optgroup label="Replicate">
                        <option value="flux-schnell">Flux Schnell (Speed)</option>
                        <option value="flux-dev">Flux Dev (Quality)</option>
                        <option value="sdxl-turbo">SDXL Turbo (Fastest)</option>
                        <option value="seedream4">SeeDream4 (Artistic)</option>
                        <option value="ideogram">Ideogram (Text Rendering)</option>
                    </optgroup>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
            
            {/* Resolution Selector for Gemini Pro */}
            {imageModel === 'gemini-3-pro-image-preview' && (
                <div className="mt-2 ml-1">
                     <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 mb-1">Resolution:</label>
                     <div className="flex gap-2">
                        {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                            <button
                                key={size}
                                onClick={() => setImageSize(size)}
                                className={`flex-1 py-1 text-[10px] font-semibold rounded border transition-colors ${
                                    imageSize === size 
                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400' 
                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                     </div>
                </div>
            )}
        </div>

        {/* Website URL Overlay */}
        <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Website URL (On Image):</label>
            <input 
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="e.g. mydomain.com"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                disabled={isProcessing}
            />
        </div>
      </div>

      <div className="mt-8 space-y-3">
         <button
            onClick={handleLoadSample}
            disabled={isProcessing}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2"
        >
            &lt; &gt; Load Sample
        </button>

        <button
            onClick={handleGenerate}
            disabled={isProcessing || !inputText.trim()}
            className={`w-full py-3 px-4 rounded-lg text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2
            ${isProcessing || !inputText.trim() 
                ? 'bg-emerald-300 dark:bg-emerald-800/50 cursor-not-allowed' 
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-md hover:shadow-lg'}`}
        >
            {isProcessing ? (
                <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
                </>
            ) : (
                <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Generate Prompts
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default InputSection;

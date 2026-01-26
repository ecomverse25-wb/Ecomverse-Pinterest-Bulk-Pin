
import React, { useState } from 'react';
import { APP_CONFIG } from '../config';

interface LicenseModalProps {
  onActivate: (googleKey: string, replicateKey: string) => void;
}

const LicenseModal: React.FC<LicenseModalProps> = ({ onActivate }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [replicateKey, setReplicateKey] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async () => {
    setError('');

    if (!licenseKey.trim()) {
        setError("Please enter your License Key.");
        return;
    }
    if (!googleKey.trim()) {
        setError("Google API Key is required to run the application.");
        return;
    }

    setLoading(true);
    
    // Normalize key for comparison
    const cleanedKey = licenseKey.trim().toUpperCase();

    // --- MASTER KEY BYPASS ---
    // If the user enters your specific key, grant access immediately.
    // This allows you to use the app even if the backend server isn't running.
    if (cleanedKey === 'WAL7BXDX') {
         setTimeout(() => { 
            localStorage.setItem('ecomverse_license_active', 'true');
            localStorage.setItem('ecomverse_license_key', cleanedKey);
            localStorage.setItem('ecomverse_google_key', googleKey.trim());
            localStorage.setItem('ecomverse_replicate_key', replicateKey.trim());
            
            onActivate(googleKey.trim(), replicateKey.trim());
            setLoading(false);
         }, 800); // Small delay for UX
         return;
    }
    // -------------------------

    try {
        // Call the backend server to verify the license key
        const response = await fetch(APP_CONFIG.LICENSE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ licenseKey: cleanedKey })
        });

        const data = await response.json();

        if (response.ok && data.valid) {
            // Success: Save all keys to localStorage
            localStorage.setItem('ecomverse_license_active', 'true');
            localStorage.setItem('ecomverse_license_key', cleanedKey);
            localStorage.setItem('ecomverse_google_key', googleKey.trim());
            localStorage.setItem('ecomverse_replicate_key', replicateKey.trim());
            
            // Trigger activation in parent
            onActivate(googleKey.trim(), replicateKey.trim());
        } else {
            // Failure: Server said no
            setError(data.message || 'Invalid License Key.');
        }

    } catch (err) {
        console.error("License check failed", err);
        setError('Could not connect to license server. If you have a Master Key, ensure it is entered correctly (WAL7BXDX).');
    } finally {
        if (cleanedKey !== 'WAL7BXDX') {
             setLoading(false);
        }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-50/90 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center border border-slate-700 my-8">
        
        {/* Ecomverse Logo */}
        <div className="mb-6 flex flex-col items-center justify-center">
            <div className="flex items-center h-16 mb-2 select-none">
                 <span className="text-6xl font-black text-white tracking-tighter">E</span>
                 <div className="w-1 h-12 bg-white mx-2"></div>
                 <span className="text-6xl font-black text-yellow-400 tracking-tighter">V</span>
            </div>
            <div className="flex text-xl font-bold tracking-tight select-none">
                <span className="text-white">ECOM</span>
                <span className="text-yellow-400">VERSE</span>
            </div>
        </div>

        <h1 className="text-lg font-bold text-white mb-2">Activate Application</h1>
        <p className="text-slate-400 text-xs mb-6">
            Please enter your provided License Key and your own API Keys to enable AI generation features.
        </p>

        <div className="space-y-4 text-left mb-6">
            
            {/* License Key */}
            <div>
                <label className="block text-xs font-bold text-white mb-1.5 uppercase tracking-wide">License Key <span className="text-red-400">*</span></label>
                <input 
                    type="text" 
                    value={licenseKey}
                    onChange={(e) => { setLicenseKey(e.target.value); setError(''); }}
                    placeholder="EV-XXXX-XXXX-XXXX"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Google API Key */}
            <div>
                <label className="block text-xs font-bold text-white mb-1.5 uppercase tracking-wide">Google Gemini API Key <span className="text-red-400">*</span></label>
                <input 
                    type="password" 
                    value={googleKey}
                    onChange={(e) => { setGoogleKey(e.target.value); setError(''); }}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Required for AI generation. <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline">Get Key Here</a></p>
            </div>

            {/* Replicate API Key */}
            <div>
                <label className="block text-xs font-bold text-white mb-1.5 uppercase tracking-wide">Replicate API Token <span className="text-slate-500 normal-case">(Optional)</span></label>
                <input 
                    type="password" 
                    value={replicateKey}
                    onChange={(e) => setReplicateKey(e.target.value)}
                    placeholder="r8_..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                 <p className="text-[10px] text-slate-500 mt-1">Required only for Flux/Ideogram models.</p>
            </div>

             {error && <p className="text-xs text-red-400 font-medium text-center p-2 bg-red-900/20 rounded border border-red-900/50">{error}</p>}
        </div>

        <button 
            onClick={handleActivate}
            disabled={loading}
            className={`w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2
                ${loading ? 'opacity-80 cursor-wait' : ''}`}
        >
            {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <>
                Activate
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default LicenseModal;

"use client";

import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, ExternalLink, Check } from "lucide-react";
import { getUser } from "@/lib/supabase";
import { getUserSettingsAction, updateUserSettingsAction } from "@/app/actions/user-settings-actions";

export default function AccountPage() {
    const [userEmail, setUserEmail] = useState("");
    const [geminiKey, setGeminiKey] = useState("");
    const [replicateKey, setReplicateKey] = useState("");
    const [imgbbKey, setImgbbKey] = useState("");
    const [showKeys, setShowKeys] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Load user and API keys on mount
    useEffect(() => {
        const loadData = async () => {
            // Get user email
            const { user } = await getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }

            // Load API keys from Database
            const { settings, error } = await getUserSettingsAction();
            if (settings) {
                setGeminiKey(settings.gemini_api_key || '');
                setReplicateKey(settings.replicate_api_key || '');
                setImgbbKey(settings.imgbb_api_key || '');
            } else if (error) {
                console.error("Failed to load settings:", error);
            }
        };

        loadData();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);

        const { success, error } = await updateUserSettingsAction({
            gemini_api_key: geminiKey,
            replicate_api_key: replicateKey,
            imgbb_api_key: imgbbKey
        });

        if (!success) {
            alert("Failed to save settings: " + error);
            setIsSaving(false);
            return;
        }

        // Update functionality in real-time by updating localStorage as fallback/cache or just relying on DB? 
        // For now, let's keep localStorage as a cache/backup if we want to avoid breaking changes in other components abruptly, 
        // BUT the goal is migration. Let's assume other components might need updates if they read from localStorage.
        // We will remove localStorage writing here to enforce DB usage, but checking where else these keys are read is important.

        // Clearing potentially stale localStorage items to avoid confusion
        localStorage.removeItem('pinverse_google_api_key');
        localStorage.removeItem('pinverse_replicate_api_key');
        localStorage.removeItem('pinverse_imgbb_api_key');

        setSaved(true);
        setIsSaving(false);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="max-w-2xl" style={{ color: 'var(--foreground)' }}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
                <p style={{ color: 'var(--muted)' }}>Manage your profile and API keys.</p>
            </div>

            {/* Profile Section */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <h2 className="text-lg font-bold mb-4">Profile</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)', opacity: 0.9 }}>Email</label>
                        <input
                            type="email"
                            value={userEmail || "Loading..."}
                            disabled
                            className="w-full rounded-lg px-4 py-3 cursor-not-allowed"
                            style={{ background: 'var(--secondary)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)', opacity: 0.9 }}>Subscription</label>
                        <div className="flex items-center gap-3">
                            <span
                                className="px-4 py-2 rounded-lg font-medium"
                                style={{ background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.2)', color: 'var(--primary)' }}
                            >
                                Pro Plan
                            </span>
                            <a href="/dashboard/billing" className="hover:underline text-sm" style={{ color: 'var(--primary)' }}>
                                Manage subscription
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Keys Section */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">API Keys</h2>
                    <button
                        onClick={() => setShowKeys(!showKeys)}
                        className="text-sm flex items-center gap-2 transition hover:opacity-80"
                        style={{ color: 'var(--muted)' }}
                    >
                        {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showKeys ? "Hide" : "Show"} Keys
                    </button>
                </div>

                <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                    Add your API keys to enable AI-powered features. Your keys are stored locally in your browser and only used to make API calls on your behalf.
                </p>

                <div className="space-y-5">
                    {/* Google Gemini */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.9 }}>Google Gemini API Key</label>
                            <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-xs flex items-center gap-1"
                                style={{ color: 'var(--primary)' }}
                            >
                                Get Key <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        <input
                            type={showKeys ? "text" : "password"}
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="AIza..."
                            className="w-full rounded-lg px-4 py-3 outline-none transition"
                            style={{
                                background: 'var(--secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)'
                            }}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Required for AI content generation</p>
                    </div>

                    {/* Replicate */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.9 }}>Replicate API Key (Optional)</label>
                            <a
                                href="https://replicate.com/account/api-tokens"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-xs flex items-center gap-1"
                                style={{ color: 'var(--primary)' }}
                            >
                                Get Key <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        <input
                            type={showKeys ? "text" : "password"}
                            value={replicateKey}
                            onChange={(e) => setReplicateKey(e.target.value)}
                            placeholder="r8_..."
                            className="w-full rounded-lg px-4 py-3 outline-none transition"
                            style={{
                                background: 'var(--secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)'
                            }}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>For advanced image models (FLUX, SDXL)</p>
                    </div>

                    {/* ImgBB */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.9 }}>ImgBB API Key (Optional)</label>
                            <a
                                href="https://api.imgbb.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-xs flex items-center gap-1"
                                style={{ color: 'var(--primary)' }}
                            >
                                Get Key <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        <input
                            type={showKeys ? "text" : "password"}
                            value={imgbbKey}
                            onChange={(e) => setImgbbKey(e.target.value)}
                            placeholder="b80aeb48..."
                            className="w-full rounded-lg px-4 py-3 outline-none transition"
                            style={{
                                background: 'var(--secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)'
                            }}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>For image hosting in CSV exports (100% free)</p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
                {isSaving ? "Saving..." : saved ? (
                    <>
                        <Check className="w-4 h-4" /> Saved!
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4" /> Save Changes
                    </>
                )}
            </button>
        </div>
    );
}


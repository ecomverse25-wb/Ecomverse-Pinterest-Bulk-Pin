
import React, { useState, useEffect } from 'react';
import { APP_CONFIG } from '../config';

interface LicenseKey {
    key: string;
    owner: string;
    createdAt: string;
    active: boolean;
}

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const STORAGE_ADMIN_PASS_KEY = 'ecomverse_admin_pass';

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [keys, setKeys] = useState<LicenseKey[]>([]);
    const [newKey, setNewKey] = useState('');
    const [newOwner, setNewOwner] = useState('');
    const [addError, setAddError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Load keys from Server on mount or auth
    useEffect(() => {
        const savedPass = localStorage.getItem(STORAGE_ADMIN_PASS_KEY);
        if (savedPass && isOpen) {
            setPassword(savedPass);
            verifyAndLoad(savedPass);
        }
    }, [isOpen]);

    const verifyAndLoad = async (pass: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${APP_CONFIG.LICENSE_API_URL}?action=list`, {
                headers: { 'x-admin-password': pass }
            });
            if (res.ok) {
                const data = await res.json();
                setKeys(data);
                setIsAuthenticated(true);
                localStorage.setItem(STORAGE_ADMIN_PASS_KEY, pass);
            } else {
                throw new Error('Auth failed');
            }
        } catch (e) {
            console.error(e);
            // If explicit login attempt, show error. If auto-login, just stay logged out.
            if (password) setPasswordError('Invalid password or server error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = () => {
        setPasswordError('');
        verifyAndLoad(password);
    };

    const handleAddKey = async () => {
        setAddError('');
        const cleanKey = newKey.trim().toUpperCase();
        const cleanOwner = newOwner.trim();

        if (!cleanKey || !cleanOwner) {
            setAddError('Key and Owner are required');
            return;
        }

        try {
            const res = await fetch(`${APP_CONFIG.LICENSE_API_URL}?action=add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({ key: cleanKey, owner: cleanOwner })
            });

            if (res.ok) {
                setNewKey('');
                setNewOwner('');
                verifyAndLoad(password); // Refresh list
            } else {
                const data = await res.json();
                setAddError(data.message || 'Failed to add key');
            }
        } catch (e) {
            setAddError('Network error');
        }
    };

    const handleDeleteKey = async (keyToDelete: string) => {
        if (!confirm(`Delete ${keyToDelete}?`)) return;

        try {
            await fetch(`${APP_CONFIG.LICENSE_API_URL}?action=delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({ key: keyToDelete })
            });
            verifyAndLoad(password);
        } catch (e) {
            alert('Failed to delete');
        }
    };

    const handleToggleActive = async (keyToToggle: string) => {
        try {
            await fetch(`${APP_CONFIG.LICENSE_API_URL}?action=toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({ key: keyToToggle })
            });
            verifyAndLoad(password);
        } catch (e) {
            alert('Failed to update');
        }
    };

    const handleClose = () => {
        if (!isAuthenticated) setPassword(''); // Clear pass if not auth
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600">
                    <h2 className="text-lg font-bold text-white flex-1">License Admin Panel (PHP)</h2>
                    <button onClick={handleClose} className="text-white/70 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!isAuthenticated ? (
                        <div className="max-w-sm mx-auto text-center py-8">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Admin Login</h3>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                placeholder="Enter admin password"
                                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-center text-gray-700 dark:text-white mb-3 focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            {passwordError && <p className="text-red-500 text-sm mb-3">{passwordError}</p>}
                            <button
                                onClick={handleLogin}
                                disabled={isLoading}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Verifying...' : 'Unlock'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Add Key */}
                            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Add New License Key</h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                                        placeholder="License Key"
                                        className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-white outline-none font-mono"
                                    />
                                    <input
                                        type="text"
                                        value={newOwner}
                                        onChange={(e) => setNewOwner(e.target.value)}
                                        placeholder="Owner Name"
                                        className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-white outline-none"
                                    />
                                    <button onClick={handleAddKey} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg">Add</button>
                                </div>
                                {addError && <p className="text-red-500 text-xs mt-2">{addError}</p>}
                            </div>

                            {/* List */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Key</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Owner</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {keys.map((license) => (
                                            <tr key={license.key} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                                <td className="px-4 py-3 font-mono text-xs text-gray-800 dark:text-white">{license.key}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{license.owner}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => handleToggleActive(license.key)}
                                                        className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${license.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                                                    >
                                                        {license.active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => handleDeleteKey(license.key)} className="text-red-500 hover:text-red-600 text-xs font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {keys.length === 0 && <p className="text-center py-4 text-gray-400">No keys found.</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;

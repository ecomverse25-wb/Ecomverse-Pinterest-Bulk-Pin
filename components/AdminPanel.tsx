
import React, { useState, useEffect } from 'react';

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

const ADMIN_PASSWORD = 'ECOMVERSE-ADMIN';
const STORAGE_KEY = 'ecomverse_license_keys';

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [keys, setKeys] = useState<LicenseKey[]>([]);
    const [newKey, setNewKey] = useState('');
    const [newOwner, setNewOwner] = useState('');
    const [addError, setAddError] = useState('');

    // Load keys from localStorage on mount
    useEffect(() => {
        if (isOpen && isAuthenticated) {
            loadKeys();
        }
    }, [isOpen, isAuthenticated]);

    const loadKeys = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setKeys(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load keys', e);
        }
    };

    const saveKeys = (newKeys: LicenseKey[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
        setKeys(newKeys);
    };

    const handleLogin = () => {
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setPasswordError('');
            loadKeys();
        } else {
            setPasswordError('Incorrect password');
        }
    };

    const handleAddKey = () => {
        setAddError('');
        const cleanKey = newKey.trim().toUpperCase();
        const cleanOwner = newOwner.trim();

        if (!cleanKey) {
            setAddError('License key is required');
            return;
        }
        if (!cleanOwner) {
            setAddError('Owner name is required');
            return;
        }
        if (keys.some(k => k.key === cleanKey)) {
            setAddError('This key already exists');
            return;
        }

        const newLicense: LicenseKey = {
            key: cleanKey,
            owner: cleanOwner,
            createdAt: new Date().toISOString(),
            active: true
        };

        saveKeys([...keys, newLicense]);
        setNewKey('');
        setNewOwner('');
    };

    const handleDeleteKey = (keyToDelete: string) => {
        if (confirm(`Are you sure you want to delete "${keyToDelete}"?`)) {
            saveKeys(keys.filter(k => k.key !== keyToDelete));
        }
    };

    const handleToggleActive = (keyToToggle: string) => {
        saveKeys(keys.map(k =>
            k.key === keyToToggle ? { ...k, active: !k.active } : k
        ));
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(keys, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ecomverse-licenses-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleClose = () => {
        setIsAuthenticated(false);
        setPassword('');
        setPasswordError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-white">License Admin Panel</h2>
                        <p className="text-xs text-white/70">Manage customer license keys</p>
                    </div>
                    <button onClick={handleClose} className="text-white/70 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!isAuthenticated ? (
                        /* Login Form */
                        <div className="max-w-sm mx-auto text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Admin Authentication</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter admin password to access key management</p>

                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                placeholder="Enter admin password"
                                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-center text-gray-700 dark:text-white mb-3 focus:ring-2 focus:ring-purple-500 outline-none"
                            />

                            {passwordError && <p className="text-red-500 text-sm mb-3">{passwordError}</p>}

                            <button
                                onClick={handleLogin}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
                            >
                                Unlock Admin Panel
                            </button>
                        </div>
                    ) : (
                        /* Admin Content */
                        <div className="space-y-6">
                            {/* Add New Key Section */}
                            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add New License Key
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                                        placeholder="License Key (e.g., EV-CLIENT-001)"
                                        className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                    />
                                    <input
                                        type="text"
                                        value={newOwner}
                                        onChange={(e) => setNewOwner(e.target.value)}
                                        placeholder="Owner Name"
                                        className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <button
                                        onClick={handleAddKey}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                                    >
                                        Add Key
                                    </button>
                                </div>
                                {addError && <p className="text-red-500 text-xs mt-2">{addError}</p>}
                            </div>

                            {/* Keys Table */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                        License Keys ({keys.length})
                                    </h3>
                                    {keys.length > 0 && (
                                        <button
                                            onClick={handleExport}
                                            className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Export JSON
                                        </button>
                                    )}
                                </div>

                                {keys.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                                        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                        <p className="text-sm">No license keys yet. Add your first key above!</p>
                                    </div>
                                ) : (
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
                                                                className={`px-2 py-1 text-xs font-medium rounded-full transition-colors
                                  ${license.active
                                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                                                            >
                                                                {license.active ? 'Active' : 'Inactive'}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={() => handleDeleteKey(license.key)}
                                                                className="text-red-500 hover:text-red-600 text-xs font-medium"
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Info Note */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                                <strong>Note:</strong> Keys are stored in your browser's localStorage. The master key <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">WAL7BXDX</code> always works regardless of this list.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;

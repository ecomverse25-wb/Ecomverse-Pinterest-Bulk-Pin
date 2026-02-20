import { useState, useEffect } from 'react';
import { Tool, UserToolVisibility, toggleToolGlobal, toggleToolForUser, removeToolOverrideForUser, getToolVisibilityForUser } from '@/app/actions/tool-actions';
import { Check, X, Loader2, Search, RotateCcw, Save } from 'lucide-react';

interface ToolVisibilityManagerProps {
    initialTools: Tool[];
}

type OverrideStatus = 'default' | 'visible' | 'hidden';

export default function ToolVisibilityManager({ initialTools }: ToolVisibilityManagerProps) {
    const [tools, setTools] = useState<Tool[]>(initialTools);
    const [loading, setLoading] = useState<string | null>(null);

    // User Management State
    const [targetUserId, setTargetUserId] = useState('');
    const [userOverrides, setUserOverrides] = useState<UserToolVisibility[]>([]);
    const [userLoading, setUserLoading] = useState(false);
    const [activeUser, setActiveUser] = useState<string | null>(null);

    // Sync state with prop updates
    useEffect(() => {
        setTools(initialTools);
    }, [initialTools]);

    const handleGlobalToggle = async (toolId: string, currentStatus: boolean) => {
        setLoading(toolId);
        try {
            await toggleToolGlobal(toolId, !currentStatus);
            setTools(tools.map(t =>
                t.id === toolId ? { ...t, is_globally_visible: !currentStatus } : t
            ));
        } catch (error) {
            console.error('Failed to toggle tool', error);
            alert('Failed to update tool visibility');
        } finally {
            setLoading(null);
        }
    };

    const handleLoadUser = async () => {
        if (!targetUserId.trim()) return;
        setUserLoading(true);
        try {
            const overrides = await getToolVisibilityForUser(targetUserId);
            setUserOverrides(overrides);
            setActiveUser(targetUserId);
        } catch (error) {
            console.error('Failed to load user', error);
            alert('Failed to load user settings');
        } finally {
            setUserLoading(false);
        }
    };

    const handleUserOverrideChange = async (toolId: string, status: OverrideStatus) => {
        if (!activeUser) return;
        setLoading(`user-${toolId}`);
        try {
            if (status === 'default') {
                await removeToolOverrideForUser(activeUser, toolId);
                // Remove from local state
                setUserOverrides(prev => prev.filter(o => o.tool_id !== toolId));
            } else {
                const isVisible = status === 'visible';
                await toggleToolForUser(activeUser, toolId, isVisible);
                // Update local state
                setUserOverrides(prev => {
                    const exists = prev.find(o => o.tool_id === toolId);
                    if (exists) {
                        return prev.map(o => o.tool_id === toolId ? { ...o, is_visible: isVisible } : o);
                    }
                    return [...prev, { user_id: activeUser, tool_id: toolId, is_visible: isVisible }];
                });
            }
        } catch (error) {
            console.error('Failed to set override', error);
            alert('Failed to update user override');
        } finally {
            setLoading(null);
        }
    };

    const getOverrideStatus = (toolId: string): OverrideStatus => {
        const override = userOverrides.find(o => o.tool_id === toolId);
        if (!override) return 'default';
        return override.is_visible ? 'visible' : 'hidden';
    };

    const getEffectiveStatus = (tool: Tool) => {
        const override = userOverrides.find(o => o.tool_id === tool.id);
        if (override) return override.is_visible;
        return tool.is_globally_visible;
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Tool Visibility Control</h2>

            {/* Global Settings Table */}
            <div className="overflow-x-auto mb-8">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="pb-3 text-slate-400 font-medium">Tool Name</th>
                            <th className="pb-3 text-slate-400 font-medium">ID</th>
                            <th className="pb-3 text-slate-400 font-medium">Global Status</th>
                            <th className="pb-3 text-slate-400 font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {tools.map((tool) => (
                            <tr key={tool.id} className="group hover:bg-slate-700/30 transition">
                                <td className="py-4 text-white font-medium">{tool.name}</td>
                                <td className="py-4 text-slate-500 font-mono text-xs">{tool.id}</td>
                                <td className="py-4">
                                    {tool.is_globally_visible ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                            <Check className="w-3 h-3" /> Visible
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                                            <X className="w-3 h-3" /> Hidden
                                        </span>
                                    )}
                                </td>
                                <td className="py-4">
                                    <button
                                        onClick={() => handleGlobalToggle(tool.id, tool.is_globally_visible)}
                                        disabled={loading === tool.id}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${tool.is_globally_visible
                                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            }`}
                                    >
                                        {loading === tool.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {tool.is_globally_visible ? 'Hide Globally' : 'Show Globally'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* User Specific Settings */}
            <div className="mt-6 p-6 bg-slate-900/50 rounded-xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-2">User-Specific Overrides</h3>
                <p className="text-sm text-slate-400 mb-4">Search for a user by UUID to manage their specific tool access. Overrides take precedence over global settings.</p>

                <div className="flex gap-2 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Enter User UUID..."
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white w-full focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
                        />
                    </div>
                    <button
                        onClick={handleLoadUser}
                        disabled={userLoading || !targetUserId}
                        className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg text-sm font-bold hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {userLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Settings'}
                    </button>
                </div>

                {activeUser && (
                    <div className="overflow-x-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-slate-400 text-sm">Editing settings for:</span>
                            <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded text-xs">{activeUser}</span>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="pb-3 text-slate-400 font-medium">Tool</th>
                                    <th className="pb-3 text-slate-400 font-medium">Global</th>
                                    <th className="pb-3 text-slate-400 font-medium">User Override</th>
                                    <th className="pb-3 text-slate-400 font-medium">Effective Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {tools.map((tool) => {
                                    const status = getOverrideStatus(tool.id);
                                    const effective = getEffectiveStatus(tool);
                                    return (
                                        <tr key={tool.id} className="group hover:bg-slate-800/50 transition">
                                            <td className="py-3 text-white text-sm font-medium">{tool.name}</td>
                                            <td className="py-3">
                                                {tool.is_globally_visible ? (
                                                    <span className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Visible</span>
                                                ) : (
                                                    <span className="text-red-400 text-xs flex items-center gap-1"><X className="w-3 h-3" /> Hidden</span>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 w-fit border border-slate-700">
                                                    <button
                                                        onClick={() => handleUserOverrideChange(tool.id, 'default')}
                                                        disabled={loading === `user-${tool.id}`}
                                                        className={`px-3 py-1 rounded text-xs font-medium transition ${status === 'default'
                                                                ? 'bg-slate-600 text-white shadow-sm'
                                                                : 'text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Use Global Setting"
                                                    >
                                                        Default
                                                    </button>
                                                    <button
                                                        onClick={() => handleUserOverrideChange(tool.id, 'visible')}
                                                        disabled={loading === `user-${tool.id}`}
                                                        className={`px-3 py-1 rounded text-xs font-medium transition ${status === 'visible'
                                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                                : 'text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Force Show"
                                                    >
                                                        Show
                                                    </button>
                                                    <button
                                                        onClick={() => handleUserOverrideChange(tool.id, 'hidden')}
                                                        disabled={loading === `user-${tool.id}`}
                                                        className={`px-3 py-1 rounded text-xs font-medium transition ${status === 'hidden'
                                                                ? 'bg-red-500 text-white shadow-sm'
                                                                : 'text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Force Hide"
                                                    >
                                                        Hide
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                {effective ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                                        Visible
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                                                        Hidden
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

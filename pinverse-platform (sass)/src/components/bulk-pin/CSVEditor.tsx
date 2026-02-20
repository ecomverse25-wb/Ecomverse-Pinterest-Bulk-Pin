"use client";

import React, { useState, useEffect } from 'react';
import { PinData, CSVPinData, CSVSettings } from '@/lib/types';
import { ArrowLeft, Download, Loader2, Table } from 'lucide-react';

interface CSVEditorProps {
    isOpen: boolean;
    onClose: () => void;
    pins: PinData[];
    csvSettings: CSVSettings;
}

export default function CSVEditor({ isOpen, onClose, pins, csvSettings }: CSVEditorProps) {
    const [csvData, setCsvData] = useState<CSVPinData[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (isOpen && pins.length > 0) {
            // Move generateCSVData inside or use it from props/callback if it's stable. 
            // Since generateCSVData is defined inside component and uses currentDate (which changes), 
            // we should probably just move the logic inside useEffect or useCallback.
            // But to fix lint quickly and correctly:

            const now = new Date();
            const intervalMinutes = parseInt(csvSettings.postInterval);
            const pinsPerDay = csvSettings.pinsPerDay;

            const currentDate = new Date(now);
            currentDate.setMinutes(Math.ceil(currentDate.getMinutes() / 30) * 30, 0, 0);
            let pinsScheduledToday = 0;

            const initialData = pins
                .filter(pin => pin.status === 'complete' && pin.imageUrl)
                .map((pin) => {
                    if (pinsScheduledToday >= pinsPerDay) {
                        currentDate.setDate(currentDate.getDate() + 1);
                        currentDate.setHours(8, 0, 0, 0);
                        pinsScheduledToday = 0;
                    }

                    const publishDate = new Date(currentDate);
                    currentDate.setMinutes(currentDate.getMinutes() + intervalMinutes);
                    pinsScheduledToday++;

                    return {
                        id: pin.id,
                        title: pin.title,
                        description: pin.description,
                        mediaUrl: pin.imageUrl?.startsWith('data:') ? '(auto-filled on export)' : (pin.imageUrl || ''),
                        link: pin.url,
                        pinterestBoard: '',
                        publishDate: formatDateForInput(publishDate),
                        thumbnail: '',
                        keywords: pin.tags?.join(', ') || ''
                    };
                });
            setCsvData(initialData);
        }
    }, [isOpen, pins, csvSettings]);

    // generateCSVData removed as it is now inlined in useEffect


    const formatDateForInput = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const handleFieldChange = (id: string, field: keyof CSVPinData, value: string) => {
        setCsvData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleExportCSV = async () => {
        if (csvData.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        let exportData = [...csvData];

        // Upload images to ImgBB if API key is set
        if (csvSettings.imgbbApiKey) {
            const pinsNeedingUpload = pins.filter(pin =>
                pin.imageUrl?.startsWith('data:') && csvData.find(csv => csv.id === pin.id)
            );

            for (let i = 0; i < pinsNeedingUpload.length; i++) {
                const pin = pinsNeedingUpload[i];
                try {
                    const response = await fetch('https://api.imgbb.com/1/upload', {
                        method: 'POST',
                        body: (() => {
                            const formData = new FormData();
                            formData.append('key', csvSettings.imgbbApiKey);
                            formData.append('image', pin.imageUrl!.split(',')[1]);
                            return formData;
                        })()
                    });

                    const result = await response.json();
                    if (result.success && result.data?.url) {
                        exportData = exportData.map(csv =>
                            csv.id === pin.id ? { ...csv, mediaUrl: result.data.url } : csv
                        );
                    }
                } catch (error) {
                    console.error('Failed to upload image:', error);
                }
                setUploadProgress(Math.round(((i + 1) / pinsNeedingUpload.length) * 100));
            }
        }

        // Generate CSV content
        const headers = ['Title', 'Description', 'Media URL', 'Link', 'Pinterest Board', 'Publish Date', 'Thumbnail', 'Keywords'];

        const escapeCsvField = (field: string) => {
            const cleaned = String(field || '').replace(/[\r\n\t]+/g, ' ').trim();
            return `"${cleaned.replace(/"/g, '""')}"`;
        };

        const csvRows = exportData.map(row => [
            escapeCsvField(row.title),
            escapeCsvField(row.description),
            escapeCsvField(row.mediaUrl),
            escapeCsvField(row.link),
            escapeCsvField(row.pinterestBoard),
            escapeCsvField(row.publishDate.replace('T', ' ')),
            escapeCsvField(row.thumbnail),
            escapeCsvField(row.keywords)
        ].join(','));

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        link.setAttribute('href', url);
        link.setAttribute('download', `pinterest-bulk-upload-${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setIsUploading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
            {/* Header */}
            <div className="h-16 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                        <Table className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">CSV Editor - Review & Edit Your Pinterest Bulk Upload</h2>
                        <p className="text-xs text-slate-400">Edit all fields below. Changes are saved automatically. Export when ready!</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExportCSV} disabled={isUploading || csvData.length === 0}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${isUploading ? 'bg-emerald-600 text-white cursor-wait' :
                            csvData.length === 0 ? 'bg-slate-600 text-slate-400 cursor-not-allowed' :
                                'bg-emerald-500 hover:bg-emerald-600 text-white'
                            }`}>
                        {isUploading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading... {uploadProgress}%</>
                        ) : (
                            <><Download className="w-4 h-4" /> Export CSV</>
                        )}
                    </button>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Pins
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
                {csvData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                        <div className="text-center">
                            <Table className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No completed pins to export</p>
                            <p className="text-sm mt-2">Generate and complete some pins first, then come back here.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-40">Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-64">Description</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-48">Media URL</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-48">Link</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-32">Pinterest Board</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-40">Publish Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-40">Keywords</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {csvData.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-700/50">
                                        <td className="px-4 py-3">
                                            <input type="text" value={row.title} onChange={(e) => handleFieldChange(row.id, 'title', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <textarea value={row.description} onChange={(e) => handleFieldChange(row.id, 'description', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs resize-none h-16" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="text" value={row.mediaUrl} onChange={(e) => handleFieldChange(row.id, 'mediaUrl', e.target.value)}
                                                placeholder="ImgBB URL (auto-filled)" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="text" value={row.link} onChange={(e) => handleFieldChange(row.id, 'link', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="text" value={row.pinterestBoard} onChange={(e) => handleFieldChange(row.id, 'pinterestBoard', e.target.value)}
                                                placeholder="e.g., Recipes" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="datetime-local" value={row.publishDate} onChange={(e) => handleFieldChange(row.id, 'publishDate', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="text" value={row.keywords} onChange={(e) => handleFieldChange(row.id, 'keywords', e.target.value)}
                                                placeholder="e.g., healthy, recipes" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

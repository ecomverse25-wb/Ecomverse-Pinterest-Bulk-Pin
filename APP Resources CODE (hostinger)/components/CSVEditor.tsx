import React, { useState, useEffect } from 'react';
import { PinData, CSVPinData, CSVSettings, PostInterval } from '../types';

interface CSVEditorProps {
    isOpen: boolean;
    onClose: () => void;
    pins: PinData[];
    csvSettings: CSVSettings;
    imgbbApiKey: string;
}

const CSVEditor: React.FC<CSVEditorProps> = ({ isOpen, onClose, pins, csvSettings, imgbbApiKey }) => {
    const [csvData, setCsvData] = useState<CSVPinData[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Initialize CSV data from pins when modal opens
    useEffect(() => {
        if (isOpen && pins.length > 0) {
            const initialData = generateCSVData(pins, csvSettings);
            setCsvData(initialData);
        }
    }, [isOpen, pins, csvSettings]);

    // Generate initial CSV data with auto-scheduled dates
    const generateCSVData = (pins: PinData[], settings: CSVSettings): CSVPinData[] => {
        const now = new Date();
        const intervalMinutes = parseInt(settings.postInterval);
        const pinsPerDay = settings.pinsPerDay;

        let currentDate = new Date(now);
        currentDate.setMinutes(Math.ceil(currentDate.getMinutes() / 30) * 30, 0, 0); // Round to next 30 min
        let pinsScheduledToday = 0;

        return pins
            .filter(pin => pin.status === 'complete' && pin.imageUrl)
            .map((pin, index) => {
                // Calculate publish date
                if (pinsScheduledToday >= pinsPerDay) {
                    // Move to next day at 8:00 AM
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
    };

    const formatDateForInput = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const handleFieldChange = (id: string, field: keyof CSVPinData, value: string) => {
        setCsvData(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleExportCSV = async () => {
        if (csvData.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        let exportData = [...csvData];

        // Upload images to ImgBB if API key is set
        if (imgbbApiKey) {
            const pinsNeedingUpload = pins.filter(pin =>
                pin.imageUrl?.startsWith('data:') &&
                csvData.find(csv => csv.id === pin.id)
            );

            for (let i = 0; i < pinsNeedingUpload.length; i++) {
                const pin = pinsNeedingUpload[i];
                try {
                    const response = await fetch('https://api.imgbb.com/1/upload', {
                        method: 'POST',
                        body: (() => {
                            const formData = new FormData();
                            formData.append('key', imgbbApiKey);
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
        const headers = [
            'Title',
            'Description',
            'Media URL',
            'Link',
            'Pinterest Board',
            'Publish Date',
            'Thumbnail',
            'Keywords'
        ];

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
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">CSV Editor - Review & Edit Your Pinterest Bulk Upload</h2>
                        <p className="text-xs text-gray-400">Edit all fields below. Changes are saved automatically. Export when ready!</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        disabled={isUploading || csvData.length === 0}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${isUploading ? 'bg-emerald-600 text-white cursor-wait' :
                                csvData.length === 0 ? 'bg-gray-600 text-gray-400 cursor-not-allowed' :
                                    'bg-emerald-500 hover:bg-emerald-600 text-white'
                            }`}
                    >
                        {isUploading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Uploading... {uploadProgress}%
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export CSV
                            </>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Pins
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
                {csvData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg">No completed pins to export</p>
                            <p className="text-sm mt-2">Generate and complete some pins first, then come back here.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider w-40">Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider w-64">Description</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider w-48">Media URL</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider w-48">Link</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider w-32">Pinterest Board</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider w-40">Publish Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider w-32">Thumbnail</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider w-40">Keywords</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {csvData.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-700/50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={row.title}
                                                onChange={(e) => handleFieldChange(row.id, 'title', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <textarea
                                                value={row.description}
                                                onChange={(e) => handleFieldChange(row.id, 'description', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none h-16"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={row.mediaUrl}
                                                onChange={(e) => handleFieldChange(row.id, 'mediaUrl', e.target.value)}
                                                placeholder={imgbbApiKey ? 'ImgBB URL (auto-filled)' : 'Enter URL...'}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={row.link}
                                                onChange={(e) => handleFieldChange(row.id, 'link', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={row.pinterestBoard}
                                                onChange={(e) => handleFieldChange(row.id, 'pinterestBoard', e.target.value)}
                                                placeholder="e.g., Recipes"
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="datetime-local"
                                                value={row.publishDate}
                                                onChange={(e) => handleFieldChange(row.id, 'publishDate', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={row.thumbnail}
                                                onChange={(e) => handleFieldChange(row.id, 'thumbnail', e.target.value)}
                                                placeholder="Optional"
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={row.keywords}
                                                onChange={(e) => handleFieldChange(row.id, 'keywords', e.target.value)}
                                                placeholder="e.g., healthy, recipes"
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
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
};

export default CSVEditor;

import { PinConfig } from '@/lib/types';

export async function parseFile(file: File): Promise<string> {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    switch (fileType) {
        case 'xlsx':
        case 'xls':
            return parseExcel(file);
        case 'docx':
            return parseWord(file);
        case 'pdf':
            return parsePDF(file);
        case 'txt':
        case 'csv':
            return parseText(file);
        default:
            throw new Error(`Unsupported file type: .${fileType}`);
    }
}

async function parseText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

async function parseExcel(file: File): Promise<string> {
    // Dynamic import for xlsx
    const XLSX = (await import('xlsx')).default;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                let text = '';
                // Read all sheets
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    text += json.map((row: any) => row.join(' ')).join('\n') + '\n';
                });

                resolve(text);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

async function parseWord(file: File): Promise<string> {
    // Dynamic import for mammoth
    const mammoth = (await import('mammoth')).default;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const result = await mammoth.extractRawText({ arrayBuffer });
                resolve(result.value);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

async function parsePDF(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Dynamic import for pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker source
        // Set worker source to local file (copied via webpack in next.config.ts)
        pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.min.mjs';

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            text += strings.join(' ') + '\n';
        }

        return text;
    } catch (error) {
        throw new Error('Failed to parse PDF: ' + (error as any).message);
    }
}


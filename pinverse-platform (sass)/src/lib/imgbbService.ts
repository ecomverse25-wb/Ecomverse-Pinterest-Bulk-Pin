/**
 * ImgBB Image Hosting Service
 * Uploads images to ImgBB and returns public URLs
 */

const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

/**
 * Upload a base64 image to ImgBB
 */
export async function uploadToImgBB(base64Image: string, apiKey: string): Promise<string> {
    if (!apiKey) {
        throw new Error('ImgBB API key is required');
    }

    // Remove data URI prefix if present
    let cleanBase64 = base64Image;
    if (base64Image.includes(',')) {
        cleanBase64 = base64Image.split(',')[1];
    }

    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', cleanBase64);

    try {
        const response = await fetch(IMGBB_API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to upload image to ImgBB');
        }

        const data = await response.json();

        if (data.success && data.data?.url) {
            return data.data.url;
        } else {
            throw new Error('Invalid response from ImgBB');
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('ImgBB upload error:', error);
        throw new Error(`ImgBB upload failed: ${errorMessage}`);
    }
}

/**
 * Upload multiple images to ImgBB
 */
export async function uploadMultipleToImgBB(
    images: { id: string; base64: string }[],
    apiKey: string
): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const image of images) {
        try {
            const url = await uploadToImgBB(image.base64, apiKey);
            results.set(image.id, url);
        } catch (error) {
            console.error(`Failed to upload image ${image.id}:`, error);
            results.set(image.id, '');
        }
    }

    return results;
}

export type PinStyle = 'basic_top' | 'basic_middle' | 'basic_bottom' | 'collage' | 'custom';
export type AspectRatio = '9:16' | '2:3' | '1:2';
export type ContentType = 'article' | 'product';
export type ImageModel =
    | 'gemini-2.5-flash-image'
    | 'imagen-4.0-generate-001'
    | 'gemini-3-pro-image-preview'
    | 'ideogram'
    | 'flux-schnell'
    | 'flux-dev'
    | 'sdxl-turbo'
    | 'seedream4'
    | 'pruna';

export type ImageSize = '1K' | '2K' | '4K';
export type LogoPosition =
    | 'top-left' | 'top-center' | 'top-right'
    | 'center'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface PinConfig {
    style: PinStyle;
    ratio: AspectRatio;
    model: ImageModel;
    contentType: ContentType;
    websiteUrl?: string;
    referenceImages?: string[];
    imageSize?: ImageSize;
    logoData?: string;
    logoPosition?: LogoPosition;
    logoSize?: number;
    ctaText?: string;
    ctaColor?: string;
    ctaTextColor?: string;
    ctaPosition?: LogoPosition;
}

export interface PinData {
    id: string;
    url: string;
    status: 'idle' | 'analyzing' | 'ready_for_generation' | 'generating_image' | 'complete' | 'error';
    targetKeyword: string;
    annotatedInterests: string;
    visualPrompt: string;
    title: string;
    description: string;
    tags: string[];
    imageUrl?: string;
    error?: string;
    config: PinConfig;
}

export interface GeneratedTextResponse {
    targetKeyword?: string;
    visualPrompt: string;
    title: string;
    description: string;
    tags: string[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    isLoading?: boolean;
}

export type PostInterval = '30' | '60' | '120' | '180';

export interface CSVPinData {
    id: string;
    title: string;
    description: string;
    mediaUrl: string;
    link: string;
    pinterestBoard: string;
    publishDate: string;
    thumbnail: string;
    keywords: string;
}

export interface CSVSettings {
    imgbbApiKey: string;
    postInterval: PostInterval;
    pinsPerDay: number;
}

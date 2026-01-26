
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
  | 'seedream4';

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
  referenceImages?: string[]; // Array of Base64 strings for multiple reference images
  imageSize?: ImageSize;
  
  // Logo Settings
  logoData?: string; // Base64 string of the uploaded logo
  logoPosition?: LogoPosition;
  logoSize?: number; // Percentage (10-50)

  // CTA Settings
  ctaText?: string;
  ctaColor?: string; // Hex code for background
  ctaTextColor?: string; // Hex code for text
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

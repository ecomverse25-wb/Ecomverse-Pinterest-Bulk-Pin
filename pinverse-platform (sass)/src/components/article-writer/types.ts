export interface KeywordCluster {
    topic: string;
    keywords: string[];
}

export interface Product {
    name: string;
    link: string;
    image: string;
}

export interface ArticleData {
    topic: string;
    title: string;
    content: string; // HTML
    heroImage?: string; // URL for Pin Factory
    wpLink?: string;
    wpStatus?: 'draft' | 'publish' | 'published' | 'failed' | 'unsent';
}

export interface WPCredentials {
    url: string;
    user: string;
    password: string;
}

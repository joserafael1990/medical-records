import { useMemo } from 'react';
import { API_CONFIG } from '../constants';

interface AvatarConfig {
    avatarUrl?: string;
    avatarFilePath?: string;
    avatarTemplateKey?: string;
    updatedAt?: string | number;
}

export const useAvatarUrl = (config: AvatarConfig) => {
    const { avatarUrl, avatarFilePath, avatarTemplateKey, updatedAt } = config;

    const resolvedUrl = useMemo(() => {
        if (!avatarUrl) return undefined;

        let url = avatarUrl;

        // Prepend base URL if not already a full URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            const normalized = url.startsWith('/') ? url : `/${url}`;
            url = `${API_CONFIG.BASE_URL}${normalized}`;
        }

        // Add cache busting parameter
        const cacheKey = avatarFilePath || avatarTemplateKey || updatedAt;
        if (cacheKey) {
            const separator = url.includes('?') ? '&' : '?';
            const timestamp = typeof cacheKey === 'string' ? cacheKey : String(cacheKey || Date.now());
            url = `${url}${separator}_t=${timestamp}`;
        }

        return url;
    }, [avatarUrl, avatarFilePath, avatarTemplateKey, updatedAt]);

    return resolvedUrl;
};

export const getInitials = (name?: string, fallback = 'DR'): string => {
    if (!name) return fallback;

    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase();
};

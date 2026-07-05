import { WANIKANI_COLOR } from '@/utils/scripts/defaultSettings';

export function isKanjiCounterEnabled(
	settings?: {
		extension_icon?: {
			kanji_counter?: boolean;
			badge_mode?: string;
		};
	},
): boolean {
	const icon = settings?.extension_icon;
	if (typeof icon?.kanji_counter === 'boolean') return icon.kanji_counter;
	if (icon?.badge_mode === 'none') return false;
	return true;
}

export function getBadgeBackgroundColor(): string {
	return WANIKANI_COLOR;
}

export function getContrastTextColor(backgroundColor: string): '#000000' | '#ffffff' {
	const rgb = parseHexColor(backgroundColor);
	if (!rgb) return '#ffffff';

	const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
	return luminance > 0.62 ? '#000000' : '#ffffff';
}

export function formatBadgeCount(count: number): string {
	if (count <= 0) return '';
	return count > 999 ? '999' : String(count);
}

function parseHexColor(color: string): { r: number; g: number; b: number } | null {
	const hex = color.trim().replace(/^#/, '');
	if (!/^[0-9a-f]{3}|[0-9a-f]{6}$/i.test(hex)) return null;

	const normalized = hex.length === 3
		? hex.split('').map(char => char + char).join('')
		: hex;

	return {
		r: Number.parseInt(normalized.slice(0, 2), 16),
		g: Number.parseInt(normalized.slice(2, 4), 16),
		b: Number.parseInt(normalized.slice(4, 6), 16),
	};
}

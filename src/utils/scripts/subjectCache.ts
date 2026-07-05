export const MAX_WANIKANI_LEVEL = 60;

export function getAllCacheLevels(): number[] {
	return [...Array(MAX_WANIKANI_LEVEL).keys()].map(i => i + 1);
}

/** All cached levels are kept in memory for search, random subject, and profile. */
export function getMemoryHydrateLevels(_userLevel?: number): number[] {
	return getAllCacheLevels();
}

export function formatLevelRange(levels: number[]): string {
	if (!levels.length) return '';
	if (levels.length === 1) return `Level ${levels[0]}`;
	return `Levels ${levels[0]}–${levels[levels.length - 1]}`;
}

export function formatCacheTimestamp(value: string | null | undefined): string {
	if (!value) return 'Never';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Unknown';
	return date.toLocaleString();
}

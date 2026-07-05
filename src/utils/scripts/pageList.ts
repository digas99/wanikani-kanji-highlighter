export type PageListMode = 'blacklist' | 'whitelist';

/** Sites blocked from highlighting on fresh installs (YouTube layout breaks with DOM highlights). */
export const DEFAULT_BLACKLIST = ['youtube.com'] as const;

/** Common multi-part public suffixes (e.g. bbc.co.uk → registrable domain, not co.uk). */
const MULTI_PART_SUFFIXES = new Set([
	'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'net.uk',
	'com.au', 'net.au', 'org.au', 'edu.au',
	'co.jp', 'ne.jp', 'or.jp', 'ac.jp',
	'com.br', 'co.nz', 'co.kr', 'com.cn', 'com.tw',
	'co.in', 'co.za', 'com.mx', 'com.ar',
]);

/** Registrable domain for sidebar add — strips subdomains (news.example.com → example.com). */
export function getMainDomain(host: string): string {
	const normalized = host.toLowerCase().replace(/^www\./, '');
	const parts = normalized.split('.').filter(Boolean);
	if (parts.length <= 1) return normalized;
	if (parts.length === 2) return normalized;

	const lastTwo = parts.slice(-2).join('.');
	if (MULTI_PART_SUFFIXES.has(lastTwo)) {
		return parts.slice(-3).join('.');
	}

	return lastTwo;
}

/** Strip protocol, paths, and leading www. for storage and matching. */
export function normalizeSiteEntry(raw: string): string | null {
	const trimmed = raw.trim().toLowerCase();
	if (!trimmed) return null;

	let hostname = trimmed;
	try {
		if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
			hostname = new URL(trimmed).hostname;
		} else if (trimmed.includes('/') || trimmed.includes('?')) {
			hostname = new URL(`https://${trimmed}`).hostname;
		}
	} catch {
		return null;
	}

	hostname = hostname.replace(/^www\./, '').replace(/\\./g, '.');
	if (!hostname || !/^[a-z0-9.-]+$/i.test(hostname)) return null;
	return hostname;
}

/** True when `host` is the entry or a subdomain of it. */
export function hostMatchesSiteEntry(host: string, entry: string): boolean {
	const normalizedHost = host.toLowerCase().replace(/^www\./, '');
	const normalizedEntry = normalizeSiteEntry(entry);
	if (!normalizedEntry) return false;
	return normalizedHost === normalizedEntry
		|| normalizedHost.endsWith(`.${normalizedEntry}`);
}

export function matchesSiteList(host: string, list: string[] | null | undefined): boolean {
	if (!Array.isArray(list) || !list.length) return false;
	return list.some(entry => hostMatchesSiteEntry(host, entry));
}

export function isWaniKaniHost(host: string): boolean {
	return /(^|\.)wanikani\.com$/i.test(host.replace(/^www\./, ''));
}

/**
 * Whether highlighting should be skipped on this page.
 * Blacklist mode: enabled everywhere except listed sites (and WaniKani).
 * Whitelist mode: disabled everywhere except listed sites (and always on WaniKani is still off).
 */
export function isPageHighlightBlocked(
	host: string,
	mode: PageListMode,
	blacklist: string[] | null | undefined,
	whitelist: string[] | null | undefined,
): boolean {
	const normalizedHost = host.replace(/^www\./, '');
	if (isWaniKaniHost(normalizedHost)) return true;

	if (mode === 'whitelist') {
		return !matchesSiteList(normalizedHost, whitelist);
	}

	return matchesSiteList(normalizedHost, blacklist);
}

export const pageListModeOptions = [
	{
		label: 'Highlight by default (blacklist sites)',
		value: 'blacklist' as PageListMode,
	},
	{
		label: 'Block by default (whitelist sites)',
		value: 'whitelist' as PageListMode,
	},
];

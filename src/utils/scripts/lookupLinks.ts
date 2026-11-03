import { primaryMeaning } from '@/utils/scripts/wanikani';

/** What gets put in the URL: the subject's characters or its first (primary) meaning. */
export type LookupQuery = 'characters' | 'meaning';

export type LookupLink = {
	id: string;
	name: string;
	/** URL with a `%s` (or `{query}`) placeholder for the searched text. */
	url: string;
	query: LookupQuery;
};

export const LOOKUP_PLACEHOLDERS = ['%s', '{query}'] as const;

export const LOOKUP_QUERY_OPTIONS: Array<{ label: string; value: LookupQuery }> = [
	{ label: 'Kanji / word', value: 'characters' },
	{ label: 'First meaning', value: 'meaning' },
];

/**
 * WaniKani: opens the subject's own page (its `document_url`); the search URL is the
 * fallback for subjects without one.
 */
export const WANIKANI_LOOKUP: LookupLink = {
	id: 'wanikani',
	name: 'WaniKani',
	url: 'https://www.wanikani.com/search?query=%s',
	query: 'characters',
};

function isWaniKaniLookup(link: Pick<LookupLink, 'url'>): boolean {
	return link.url === WANIKANI_LOOKUP.url;
}

/** One-click suggestions in Settings. */
export const LOOKUP_PRESETS: Array<Omit<LookupLink, 'id'>> = [
	{ name: WANIKANI_LOOKUP.name, url: WANIKANI_LOOKUP.url, query: WANIKANI_LOOKUP.query },
	{ name: 'Jisho', url: 'https://jisho.org/search/%s', query: 'characters' },
	{ name: 'Wiktionary', url: 'https://en.wiktionary.org/wiki/%s', query: 'characters' },
	{ name: 'Weblio', url: 'https://www.weblio.jp/content/%s', query: 'characters' },
	{ name: 'Tatoeba', url: 'https://tatoeba.org/en/sentences/search?from=jpn&to=eng&query=%s', query: 'characters' },
	{ name: 'Google Images', url: 'https://www.google.com/search?tbm=isch&q=%s', query: 'characters' },
];

export function createLookupLinkId(): string {
	return `lookup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function hasPlaceholder(url: string): boolean {
	return LOOKUP_PLACEHOLDERS.some(placeholder => url.includes(placeholder));
}

/**
 * Validate a user-entered URL template. Only http(s) is allowed; a template
 * without a placeholder gets `%s` appended (e.g. "https://jisho.org/search/").
 */
export function normalizeLookupUrl(raw: string): string | null {
	let url = String(raw ?? '').trim();
	if (!url) return null;
	if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

	try {
		// validate with a dummy query in place of the placeholder
		const parsed = new URL(LOOKUP_PLACEHOLDERS.reduce((acc, p) => acc.split(p).join('test'), url));
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
	} catch {
		return null;
	}

	return hasPlaceholder(url) ? url : `${url}%s`;
}

/** Text searched for a subject (radicals without characters fall back to the meaning). */
export function lookupQueryText(link: Pick<LookupLink, 'query'>, subject: any): string {
	const meaning = primaryMeaning(subject);
	if (link.query === 'meaning') return meaning || subject?.characters || '';
	return subject?.characters || meaning || '';
}

export function buildLookupUrl(link: LookupLink, subject: any): string | null {
	if (isWaniKaniLookup(link) && subject?.document_url) return subject.document_url;
	const text = lookupQueryText(link, subject);
	if (!text || !link?.url) return null;
	const encoded = encodeURIComponent(text);
	return LOOKUP_PLACEHOLDERS.reduce((acc, placeholder) => acc.split(placeholder).join(encoded), link.url);
}

/**
 * Saved lookup settings → the links to show. WaniKani joined the defaults later: it's
 * added once to lists saved before that (`wanikani_added`); removing it afterwards sticks.
 */
export function resolveLookupLinks(
	lookup: { links?: unknown; wanikani_added?: boolean } | null | undefined,
	fallback: LookupLink[] = [],
): LookupLink[] {
	const links = sanitizeLookupLinks(lookup?.links ?? fallback);
	if (lookup?.wanikani_added || links.some(isWaniKaniLookup)) return links;
	return [{ ...WANIKANI_LOOKUP }, ...links];
}

/** Keep only well-formed links (settings may come from older / edited storage). */
export function sanitizeLookupLinks(links: unknown): LookupLink[] {
	if (!Array.isArray(links)) return [];
	return links
		.filter((link: any) => link && typeof link.url === 'string' && typeof link.name === 'string')
		.map((link: any) => ({
			id: String(link.id || createLookupLinkId()),
			name: link.name.trim() || 'Lookup',
			url: link.url,
			query: link.query === 'meaning' ? 'meaning' : 'characters',
		}));
}

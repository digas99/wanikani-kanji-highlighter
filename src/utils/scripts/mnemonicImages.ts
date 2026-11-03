import { storage } from '#imports';
import { fetchTextDirectOrProxy, isBackgroundContext, isWaniKaniPage } from './wanikaniPages';

/**
 * WaniKani's mnemonic drawings (radicals), which the API doesn't have: the subject's public
 * page names the image (`<wk-mnemonic-image src aria-label>`), on files.wanikani.com.
 *
 * Both are read directly by the background script (the extension can reach
 * www.wanikani.com, and files.wanikani.com allows any origin); the CORS proxy is only a
 * fallback. A drawing found once is kept (as a data URL, ~5 KB): later views are instant
 * and offline.
 */

const CACHE_KEY = 'local:mnemonicImages';
/** Subjects without a drawing are checked again after this long (WaniKani adds them over time). */
const RECHECK_MISSING_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * Bumped when finding the drawing changes: entries saved by older code are checked again
 * (version 1 could miss a drawing and remember "none").
 */
const CACHE_VERSION = 2;

export type MnemonicImage = { dataUrl: string; alt: string };

type CacheEntry = { dataUrl: string | null; alt: string; checkedAt: number; v?: number };

function attribute(tag: string, name: string): string {
	const value = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1] ?? '';
	return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

/** Find, download and keep a subject's drawing (the background script). */
export async function loadMnemonicImage(subject: { id: number; document_url?: string }): Promise<MnemonicImage | null> {
	if (!subject?.id || !isWaniKaniPage(subject.document_url)) return null;
	const cache = (await storage.getItem<Record<string, CacheEntry>>(CACHE_KEY)) ?? {};
	const cached = cache[subject.id];
	if (cached?.dataUrl) return { dataUrl: cached.dataUrl, alt: cached.alt };
	// "no drawing" is trusted for a while, and only when the current code decided it
	if (cached && cached.v === CACHE_VERSION && Date.now() - cached.checkedAt < RECHECK_MISSING_MS) return null;

	const page = await fetchTextDirectOrProxy(subject.document_url);
	// unreachable: don't remember anything, try again next time
	if (page == null) return null;

	// the page also holds a template of the tag (src="", for its scripts): the real one has a URL
	const tag = [...page.matchAll(/<wk-mnemonic-image\b[^>]*>/gi)]
		.map(match => match[0])
		.find(candidate => /^https:\/\//.test(attribute(candidate, 'src')));
	const src = tag ? attribute(tag, 'src') : '';
	let image: MnemonicImage | null = null;
	if (src) {
		const svg = await fetchTextDirectOrProxy(src);
		if (svg == null) return null;
		if (/<svg[\s>]/i.test(svg)) {
			// an <img> never runs anything inside an SVG, so its markup can be kept as is
			image = { dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, alt: attribute(tag!, 'aria-label') };
		}
	}

	const latest = (await storage.getItem<Record<string, CacheEntry>>(CACHE_KEY)) ?? {};
	latest[subject.id] = { dataUrl: image?.dataUrl ?? null, alt: image?.alt ?? '', checkedAt: Date.now(), v: CACHE_VERSION };
	await storage.setItem(CACHE_KEY, latest);
	return image;
}

/**
 * The same from anywhere. The background does the work: on web pages (the details popup's
 * content script) requests follow the page's rules, and read from the popup, WaniKani's
 * pages make the browser preload their styles and scripts (see wanikaniPages.ts).
 */
export async function getMnemonicImage(subject: { id: number; document_url?: string }): Promise<MnemonicImage | null> {
	if (isBackgroundContext()) return loadMnemonicImage(subject);
	try {
		const result = await browser.runtime.sendMessage({
			type: 'wkh:getMnemonicImage',
			subject: { id: subject.id, document_url: subject.document_url },
		});
		return result?.dataUrl ? result : null;
	} catch {
		return null;
	}
}

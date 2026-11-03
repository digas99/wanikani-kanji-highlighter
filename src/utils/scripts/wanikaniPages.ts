import { storage } from '#imports';
import { DEFAULT_PROXY } from '@/lib/proxy';

/**
 * Reading WaniKani's public web pages (profiles for the avatar, radicals for their drawings).
 *
 * The extension can reach www.wanikani.com itself; the CORS proxy is only a fallback (e.g.
 * when the browser limits the extension's site access). Pages are read in the background
 * script: read from a page (the popup), their `Link: rel=preload` headers make the browser
 * download WaniKani's styles and scripts for nothing (blocked scripts → console errors).
 */

const WANIKANI_PAGE = /^https:\/\/www\.wanikani\.com\//;

export function isWaniKaniPage(url: unknown): url is string {
	return typeof url === 'string' && WANIKANI_PAGE.test(url);
}

async function proxyUrl(url: string): Promise<string> {
	const proxy = (await storage.getItem<string>('sync:proxyServer')) || DEFAULT_PROXY;
	return `${proxy.replace(/\/$/, '')}/${url}`;
}

/** Text of a URL: directly, else through the proxy. Null when both fail. */
export async function fetchTextDirectOrProxy(url: string): Promise<string | null> {
	try {
		const response = await fetch(url, { credentials: 'omit' });
		if (response.ok) return await response.text();
	} catch {
		// no access to the site: try the proxy
	}
	try {
		const response = await fetch(await proxyUrl(url));
		return response.ok ? await response.text() : null;
	} catch {
		return null;
	}
}

/** True in the background script (no document to preload into). */
export function isBackgroundContext(): boolean {
	return typeof document === 'undefined';
}

/** A WaniKani page's HTML, read by the background script (from anywhere in the extension). */
export async function fetchWaniKaniPage(url: string): Promise<string | null> {
	if (!isWaniKaniPage(url)) return null;
	if (isBackgroundContext()) return fetchTextDirectOrProxy(url);
	try {
		const result = await browser.runtime.sendMessage({ type: 'wkh:fetchWaniKaniPage', url });
		return typeof result === 'string' ? result : null;
	} catch {
		return null;
	}
}

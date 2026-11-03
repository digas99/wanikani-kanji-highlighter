/**
 * WaniKani's API tokens page (the Login screen's "Find API Key" link): a button under each key's
 * Expire button, with the extension's icon, to use that key in the extension.
 *
 *  - not logged in: the key is handed over (the background keeps it as pending, the Login screen
 *    has it filled in)
 *  - logged in: the extension switches to that key (only another key of the same account: its data
 *    is kept); the key already in use says so instead
 *
 * Keys are found by their shape (UUIDs), Expire buttons by their text; each Expire belongs to the
 * nearest block around it holding exactly one key. A key without an Expire found gets its button
 * after the key itself.
 */

import { storage } from '#imports';

const TOKENS_PAGE = /^\/settings\/personal_access_tokens/;
const API_KEY = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const BUTTON_CLASS = 'wkh-send-api-key';

let observer: MutationObserver | null = null;
let currentKey: string | null = null;

function isTokensPage(): boolean {
	return location.hostname === 'www.wanikani.com' && TOKENS_PAGE.test(location.pathname);
}

const keysIn = (text: string) => [...new Set((text.match(API_KEY) ?? []).map(key => key.toLowerCase()))];

type Tone = 'idle' | 'busy' | 'ok' | 'error' | 'current';

/** A short label (it's the size of WaniKani's Expire button), the whole story in its tooltip. */
function paint(button: HTMLButtonElement, label: string, tone: Tone, title: string) {
	const text = button.querySelector('.wkh-send-api-key__text');
	if (text) text.textContent = label;
	button.title = title;
	const [background, color, border] = {
		idle: ['#fff', '#d6457a', '#e36f94'],
		busy: ['#fff', '#999', '#ddd'],
		ok: ['#30a46c', '#fff', '#30a46c'],
		error: ['#fff', '#c0392b', '#c0392b'],
		current: ['#f4f4f4', '#666', '#ddd'],
	}[tone];
	button.style.background = background;
	button.style.color = color;
	button.style.borderColor = border;
	button.style.cursor = tone === 'idle' || tone === 'error' ? 'pointer' : 'default';
}

function paintIdle(button: HTMLButtonElement) {
	const key = button.dataset.key ?? '';
	if (currentKey && key === currentKey.toLowerCase()) {
		paint(button, 'In use', 'current', 'WK Highlighter uses this API key');
	} else if (currentKey) {
		paint(button, 'Use key', 'idle', 'Use this API key in WK Highlighter (another key of the same account: its data is kept)');
	} else {
		paint(button, 'Send key', 'idle', 'Send this API key to WK Highlighter, to log in with it');
	}
}

/**
 * The size of the Expire button it goes under (its width, height, corners and font size), with
 * the extension's icon as a small badge on its top-right corner.
 */
function makeButton(key: string, expire: Element | null): HTMLButtonElement {
	// no Expire button found: a size of its own
	const box = expire?.getBoundingClientRect() ?? { width: 120, height: 44 };
	const style = expire ? getComputedStyle(expire) : ({ borderRadius: '4px', fontSize: '15px' } as CSSStyleDeclaration);
	const button = document.createElement('button');
	button.type = 'button';
	button.className = BUTTON_CLASS;
	button.dataset.key = key;
	button.style.cssText = [
		'position:relative', 'display:inline-flex', 'align-items:center', 'justify-content:center',
		`width:${Math.round(box.width)}px`, `min-height:${Math.round(box.height)}px`, 'padding:4px 8px', 'box-sizing:border-box',
		'border:2px solid', `border-radius:${style.borderRadius || '4px'}`, 'font-family:inherit',
		`font-size:${Math.min(parseFloat(style.fontSize) || 16, 16)}px`, 'font-weight:700', 'line-height:1.15', 'text-align:center',
		'box-shadow:inset 0 -4px 0 rgba(0,0,0,.08)', 'overflow:visible',
	].join(';');
	const text = document.createElement('span');
	text.className = 'wkh-send-api-key__text';
	const icon = document.createElement('img');
	icon.src = browser.runtime.getURL('/icon/32.png');
	icon.alt = 'WK Highlighter';
	icon.style.cssText = 'position:absolute;top:-9px;right:-9px;width:20px;height:20px;border-radius:5px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);background:#fff';
	button.append(text, icon);
	paintIdle(button);

	button.addEventListener('click', async event => {
		event.preventDefault();
		event.stopPropagation();
		if (button.dataset.busy || (currentKey && key === currentKey.toLowerCase())) return;
		button.dataset.busy = '1';
		paint(button, '…', 'busy', currentKey ? 'Switching WK Highlighter to this key…' : 'Sending it to WK Highlighter…');
		let result: any = null;
		try {
			result = await browser.runtime.sendMessage({ type: currentKey ? 'wkh:apiKeyReplace' : 'wkh:apiKeyFromPage', key });
		} catch {
			result = null;
		}
		delete button.dataset.busy;
		if (result?.ok && !currentKey) {
			paint(button, 'Sent ✓', 'ok', 'Sent: open WK Highlighter to log in with it');
			return;
		}
		if (result?.ok) {
			// the page's other buttons follow the key now in use (storage watch)
			paint(button, 'In use ✓', 'ok', 'WK Highlighter uses this API key now');
			return;
		}
		if (result?.reason === 'other-account') {
			paint(button, 'Other account', 'error', `This key is ${result.username}'s: WK Highlighter is logged in as ${result.account}. Log out there first to use another account`);
		} else if (result?.reason === 'invalid') {
			paint(button, 'Key failed', 'error', `This key doesn't work${result.error ? `: ${result.error}` : ''}`);
		} else {
			paint(button, 'Try again', 'error', 'Couldn\'t reach WK Highlighter: try again');
		}
	});
	return button;
}

/** Each Expire button: the key of the nearest block around it holding just one key. */
function keyForExpire(expire: Element): string | null {
	for (let block = expire.parentElement; block && block !== document.body; block = block.parentElement) {
		const keys = keysIn(block.textContent ?? '');
		if (keys.length === 1) return keys[0];
		if (keys.length > 1) return null;
	}
	return null;
}

/**
 * Under the Expire button: after it, or after its form (Rails' button_to). In a row (flex) with
 * it, both go in a column exactly as wide as the Expire's own space, so it keeps its size.
 */
function placeUnder(expire: Element, button: HTMLButtonElement) {
	const anchor = expire.closest('form') ?? expire;
	const width = (anchor as HTMLElement).getBoundingClientRect().width;
	const holder = document.createElement('div');
	holder.className = `${BUTTON_CLASS}-holder`;
	holder.style.cssText = 'display:flex;justify-content:flex-end;margin-top:10px';
	holder.append(button);
	const parent = anchor.parentElement;
	if (parent && getComputedStyle(parent).display.includes('flex') && getComputedStyle(parent).flexDirection.startsWith('row')) {
		const wrapper = document.createElement('div');
		wrapper.className = `${BUTTON_CLASS}-holder`;
		wrapper.style.cssText = `display:flex;flex-direction:column;flex:0 0 auto;width:${Math.ceil(width)}px`;
		anchor.before(wrapper);
		wrapper.append(anchor, holder);
	} else {
		anchor.after(holder);
	}
}

function scan(): void {
	const done = new Set([...document.querySelectorAll<HTMLElement>(`.${BUTTON_CLASS}`)].map(button => button.dataset.key));
	// under the Expire buttons
	const expires = [...document.querySelectorAll('button, a, input[type="submit"]')]
		.filter(element => ((element as HTMLInputElement).value || element.textContent || '').trim() === 'Expire');
	for (const expire of expires) {
		const key = keyForExpire(expire);
		if (!key || done.has(key)) continue;
		done.add(key);
		placeUnder(expire, makeButton(key, expire));
	}
	// keys without an Expire button found: after the key's text
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const element = node.parentElement;
		if (!element || element.closest(`.${BUTTON_CLASS}, script, style`)) continue;
		for (const key of keysIn(node.nodeValue ?? '')) {
			if (done.has(key)) continue;
			done.add(key);
			const holder = document.createElement('div');
			holder.className = `${BUTTON_CLASS}-holder`;
			holder.style.marginTop = '10px';
			holder.append(makeButton(key, null));
			element.after(holder);
		}
	}
}

/** The key in use changed (switched here, or logged in / out): the buttons say so. */
function refreshLabels() {
	for (const button of document.querySelectorAll<HTMLButtonElement>(`.${BUTTON_CLASS}`)) paintIdle(button);
}

async function offerOnThisPage(): Promise<void> {
	observer?.disconnect();
	observer = null;
	if (!isTokensPage()) return;
	currentKey = (await storage.getItem<string>('sync:apiKey')) ?? null;
	scan();
	// keys appear later too (a newly generated one, a table filled by WaniKani's scripts)
	observer = new MutationObserver(mutations => {
		if (mutations.every(mutation => [...mutation.addedNodes].every(node => (node as Element).classList?.contains?.(`${BUTTON_CLASS}-holder`)))) return;
		scan();
	});
	observer.observe(document.body, { childList: true, subtree: true });
}

export function watchApiKeyHandoff(): void {
	if (location.hostname !== 'www.wanikani.com') return;
	void offerOnThisPage();
	storage.watch<string>('sync:apiKey', key => {
		currentKey = key ?? null;
		refreshLabels();
	});
	// WaniKani changes pages without reloading (Turbo)
	document.addEventListener('turbo:load', () => void offerOnThisPage());
	window.addEventListener('popstate', () => void offerOnThisPage());
}

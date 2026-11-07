/**
 * The HanziHero Companion, when it's installed too (cjk-highlighter's coexistence): who
 * highlights each kind of text (Japanese, Chinese, could be either) is one choice between the two
 * extensions, kept opposite (Settings → Highlight shows it as "Highlight / HanziHero").
 *
 * To message it, its id: learned from the pages both are on (the content script), or its store id.
 */

import { storage } from '#imports';
import {
	PARTNER_MESSAGE,
	PROTOCOL_VERSION,
	announcePresence,
	parsePartnerRequest,
	type LanguageChoice,
	type LanguageChoices,
	type PartnerAbout,
	type PartnerProfile,
	type TextKind,
} from 'cjk-highlighter';

/** The other extension, as last heard on a page. */
const PARTNER_KEY = 'local:partnerExtension';
/** Its ids in the stores: found even before both were on one page. */
const KNOWN_PARTNER_IDS = ['hanzihero-companion@local'];

export const SELF_NAME = 'WaniKani Kanji Highlighter';
/** How the settings name it, and its logo (a copy: public/partners). */
export const PARTNER = { name: 'HanziHero', fullName: 'HanziHero Companion', logo: '/partners/hanzihero.png' };

type Remembered = { extensionId: string; name: string; seenAt: number };

/** Whose this extension is (name, level, avatar), as the popup last knew: for the partner's popup. */
const PROFILE_CARD_KEY = 'local:profileCard';

/** Popup: the user's name, level and avatar, kept for the partner to show (only when they change). */
export async function saveProfileCard(card: PartnerProfile): Promise<void> {
	const saved = await storage.getItem<PartnerProfile>(PROFILE_CARD_KEY);
	if (JSON.stringify(saved) === JSON.stringify(card)) return;
	await storage.setItem(PROFILE_CARD_KEY, card);
}

/** Content script, on every page: says this extension is here, and remembers the HanziHero Companion's id. */
export function watchPartnerPresence(): void {
	announcePresence({ extensionId: browser.runtime.id, name: SELF_NAME, role: 'japanese' }, async other => {
		if (other.role !== 'chinese') return;
		const known = await storage.getItem<Remembered>(PARTNER_KEY);
		// written only when it's new (or a day old: still around)
		if (known?.extensionId === other.extensionId && Date.now() - known.seenAt < 24 * 60 * 60 * 1000) return;
		await storage.setItem<Remembered>(PARTNER_KEY, { extensionId: other.extensionId, name: other.name, seenAt: Date.now() });
	});
}

async function partnerIds(): Promise<string[]> {
	const remembered = await storage.getItem<Remembered>(PARTNER_KEY);
	return [...new Set([remembered?.extensionId, ...KNOWN_PARTNER_IDS].filter((id): id is string => Boolean(id) && fitsThisBrowser(id!)))];
}

/** A message from this id may change the settings: it's the partner's. */
async function isPartner(id: string | undefined): Promise<boolean> {
	return Boolean(id) && (await partnerIds()).includes(id!);
}

/** Chrome's ids are 32 letters a–p; Firefox's an email or a {uuid}: the other kind is refused (thrown). */
function fitsThisBrowser(id: string): boolean {
	return /^[a-p]{32}$/.test(id) ? import.meta.env.BROWSER !== 'firefox' : import.meta.env.BROWSER === 'firefox';
}

function ask<T>(id: string, message: unknown): Promise<T | null> {
	let sent: Promise<T | null>;
	try {
		sent = browser.runtime.sendMessage(id, message).then(answer => (answer ?? null) as T | null).catch(() => null);
	} catch {
		// an id this browser can't take
		return Promise.resolve(null);
	}
	return Promise.race([
		sent,
		// a missing extension can take a while to fail
		new Promise<null>(resolve => setTimeout(() => resolve(null), 1500)),
	]);
}

/** The HanziHero Companion, installed and enabled: its id and choices. Null: not there. */
export async function findPartner(): Promise<{ id: string; about: PartnerAbout } | null> {
	for (const id of await partnerIds()) {
		const about = await ask<PartnerAbout>(id, { type: PARTNER_MESSAGE, action: 'about' });
		if (about?.role === 'chinese' && about.protocol === PROTOCOL_VERSION) return { id, about };
	}
	return null;
}

/** Sets the partner's choice for a kind of text (the opposite of this one's). */
export async function tellPartner(id: string, text: TextKind, choice: LanguageChoice): Promise<boolean> {
	const answer = await ask<{ ok: boolean }>(id, { type: PARTNER_MESSAGE, action: 'choose', text, choice });
	return answer?.ok === true;
}

/** The setting each kind of text is in (settings.highlighter). */
export const CHOICE_SETTING: Record<TextKind, string> = { japanese: 'japanese_text', chinese: 'chinese_text', unclear: 'unclear_text' };

/** This extension's choices (its settings, not a site's exceptions). */
export function settingsChoices(settings: any): LanguageChoices {
	const choice = (text: TextKind): LanguageChoice => (settings?.highlighter?.[CHOICE_SETTING[text]] === 'skip' ? 'skip' : 'highlight');
	return { japanese: choice('japanese'), chinese: choice('chinese'), unclear: choice('unclear') };
}

/**
 * Background: the partner asks for this one's choices, or sets one of them (opposite to its own).
 * Returns the answer, or undefined when it isn't a partner request.
 */
export async function answerPartner(message: unknown, senderId: string | undefined): Promise<unknown> {
	const request = parsePartnerRequest(message);
	if (!request) return undefined;
	const settings = (await storage.getItem<any>('local:settings')) ?? {};
	if (request.action === 'about') {
		const profile = await storage.getItem<PartnerProfile>(PROFILE_CARD_KEY);
		const about: PartnerAbout = { protocol: PROTOCOL_VERSION, name: SELF_NAME, role: 'japanese', choices: settingsChoices(settings), profile };
		return about;
	}
	// only the partner changes the settings
	if (!(await isPartner(senderId))) return { ok: false };
	await storage.setItem('local:settings', {
		...settings,
		highlighter: { ...(settings.highlighter ?? {}), [CHOICE_SETTING[request.text]]: request.choice },
	});
	return { ok: true };
}

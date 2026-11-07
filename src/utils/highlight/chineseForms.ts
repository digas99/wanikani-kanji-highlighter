/**
 * WaniKani's lessons, reviews and subject pages (Settings → Details → Chinese forms, off by
 * default): the subject's simplified and traditional Chinese forms, next to it. A small badge at
 * the right of the quiz's header; a line under the title on a subject's page. Kanji Chinese doesn't
 * use are faded. The forms come from the background (utils/scripts/chineseForms.ts).
 *
 * The quiz swaps its subject in place, and WaniKani moves between pages without loading them
 * (Turbo): the page is watched, and the forms follow the subject shown.
 */

import { storage } from '#imports';
import type { ChineseForms } from '@/utils/scripts/chineseForms';

const BADGE_ID = 'wkh-chinese-forms';
const CHINESE_FONTS = {
	simplified: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
	traditional: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
};
const NOT_CHINESE_OPACITY = '0.45';
const NOT_CHINESE_TITLE = 'Faded: a kanji Chinese doesn\'t use';

let enabled = false;
let observer: MutationObserver | null = null;
let scheduled = false;
/** what's shown now: its text and where (redrawn only when they change) */
let shown: { text: string; place: Element } | null = null;

const forms = new Map<string, Promise<ChineseForms | null>>();
function formsOf(text: string): Promise<ChineseForms | null> {
	if (!forms.has(text)) {
		forms.set(text, browser.runtime.sendMessage({ type: 'wkh:chineseForms', text }).then(answer => answer ?? null).catch(() => null));
	}
	return forms.get(text)!;
}

type Target = { kind: 'quiz' | 'subject'; text: string; place: Element };

/** The subject on screen: the quiz's (lessons, reviews, extra study), or a subject page's. */
function findTarget(): Target | null {
	const quizCharacters = document.querySelector('.character-header__characters');
	const quizHeader = quizCharacters?.closest('.character-header');
	if (quizCharacters && quizHeader) return { kind: 'quiz', text: quizCharacters.textContent ?? '', place: quizHeader };
	const subject = document.querySelector('header.page-header .subject-character__characters-text');
	const content = subject?.closest('header.page-header')?.querySelector('.page-header__content');
	if (subject && content) return { kind: 'subject', text: subject.textContent ?? '', place: content };
	return null;
}

function remove(): void {
	document.getElementById(BADGE_ID)?.remove();
	shown = null;
}

/** The forms, with the kanji Chinese doesn't use faded. */
function fillForms(element: HTMLElement, list: string[], notChinese: string): void {
	list.forEach((form, index) => {
		if (index > 0) element.append(' · ');
		for (const char of form) {
			if (notChinese.includes(char)) {
				const faded = document.createElement('span');
				faded.textContent = char;
				faded.style.opacity = NOT_CHINESE_OPACITY;
				faded.title = NOT_CHINESE_TITLE;
				element.append(faded);
			} else {
				element.append(char);
			}
		}
	});
}

function row(label: string, lang: string, font: string, list: string[], notChinese: string, size: string): HTMLElement {
	const line = document.createElement('div');
	line.title = label === '简' ? 'Simplified Chinese' : 'Traditional Chinese';
	Object.assign(line.style, { display: 'flex', alignItems: 'baseline', gap: '6px' } satisfies Partial<CSSStyleDeclaration>);
	const tag = document.createElement('span');
	tag.textContent = label;
	tag.lang = lang;
	Object.assign(tag.style, { fontFamily: font, fontSize: '12px', opacity: '0.75' } satisfies Partial<CSSStyleDeclaration>);
	const text = document.createElement('span');
	text.lang = lang;
	Object.assign(text.style, { fontFamily: font, fontSize: size, lineHeight: '1.25' } satisfies Partial<CSSStyleDeclaration>);
	fillForms(text, list, notChinese);
	line.append(tag, text);
	return line;
}

function render(target: Target, result: ChineseForms): void {
	remove();
	const badge = document.createElement('div');
	badge.id = BADGE_ID;
	const quiz = target.kind === 'quiz';
	const size = quiz ? 'clamp(18px, 2.2vw, 28px)' : '16px';
	badge.append(
		row('简', 'zh-Hans', CHINESE_FONTS.simplified, result.simplified, result.notChinese, size),
		row('繁', 'zh-Hant', CHINESE_FONTS.traditional, result.traditional, result.notChinese, size),
	);
	if (result.notChinese) badge.title = `${result.notChinese}: ${NOT_CHINESE_TITLE.toLowerCase().replace('faded: a', 'not a')}`;
	if (quiz) {
		// at the right of the quiz's header, over its colour
		if (getComputedStyle(target.place).position === 'static') (target.place as HTMLElement).style.position = 'relative';
		Object.assign(badge.style, {
			position: 'absolute',
			top: '50%',
			right: '16px',
			transform: 'translateY(-50%)',
			zIndex: '5',
			display: 'flex',
			flexDirection: 'column',
			gap: '1px',
			padding: '3px 10px',
			borderRadius: '8px',
			background: 'rgba(15, 23, 42, 0.35)',
			color: '#fff',
			whiteSpace: 'nowrap',
		} satisfies Partial<CSSStyleDeclaration>);
	} else {
		// beside the subject's title (its two lines no taller than it), in the page's own colours,
		// and out of the layout: the header keeps its height, the title stays centred on the tile
		const place = target.place as HTMLElement;
		if (getComputedStyle(place).position === 'static') place.style.position = 'relative';
		const titleText = place.querySelector<HTMLElement>('.page-header__title-text');
		const position = () => {
			badge.style.left = `${titleText ? titleText.offsetLeft + titleText.offsetWidth + 24 : 0}px`;
		};
		// the title's width changes once its font is in
		void document.fonts?.ready.then(position);
		requestAnimationFrame(position);
		Object.assign(badge.style, {
			position: 'absolute',
			top: '50%',
			left: '0',
			transform: 'translateY(-50%)',
			display: 'flex',
			flexDirection: 'column',
			gap: '0',
			opacity: '0.85',
			whiteSpace: 'nowrap',
		} satisfies Partial<CSSStyleDeclaration>);
	}
	target.place.append(badge);
	shown = { text: target.text, place: target.place };
}

async function update(): Promise<void> {
	if (!enabled) return remove();
	const target = findTarget();
	if (!target) return remove();
	const text = target.text.trim();
	// still the same subject, still shown
	if (shown && shown.text === text && shown.place === target.place && document.getElementById(BADGE_ID)?.isConnected) return;
	const result = await formsOf(text);
	// the subject changed while waiting
	if (findTarget()?.text.trim() !== text) return;
	if (!result) return remove();
	render({ ...target, text }, result);
}

function schedule(): void {
	if (scheduled) return;
	scheduled = true;
	requestAnimationFrame(() => {
		scheduled = false;
		void update();
	});
}

function applySettings(settings: any): void {
	enabled = settings?.chinese_forms?.enabled === true;
	if (enabled && !observer && document.body) {
		observer = new MutationObserver(schedule);
		observer.observe(document.body, { childList: true, subtree: true, characterData: true });
	} else if (!enabled && observer) {
		observer.disconnect();
		observer = null;
	}
	void update();
}

export async function mountChineseForms(): Promise<void> {
	if (location.hostname !== 'www.wanikani.com') return;
	applySettings(await storage.getItem<any>('local:settings'));
	storage.watch<any>('local:settings', applySettings);
	// WaniKani moves between its pages without reloading (Turbo)
	document.addEventListener('turbo:load', () => {
		remove();
		void update();
	});
}

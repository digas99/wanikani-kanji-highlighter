/**
 * The page's reading level (Settings → Page reading level): a bar in the page's corner, and
 * the page sent to the history. Only runs while one of them is on; the page's text is read
 * again (on idle) as it changes, e.g. on sites that load more as you scroll.
 */

import { createApp, reactive, type App } from 'vue';
import { storage } from '#imports';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import PageStatsBar from '@/components/highlight/PageStatsBar.vue';
import type { HighlightData } from './highlightConfig';
import { isPageHighlightBlocked, type PageListMode } from '@/utils/scripts/pageList';
import {
	buildPageStatsTables,
	computePageStats,
	FOCUS_SITES_KEY,
	HIDDEN_SITES_KEY,
	joyoLevel,
	SECTIONS_KEY,
	MIN_PAGE_KANJI,
	resolvePageStatsView,
	unitCounts,
	type PageStats,
	type PageStatsTables,
	type PageStatsView,
} from '@/utils/scripts/pageStats';
import { pageKey } from '@/utils/scripts/pageHistory';
import { chooseSentences, extractSentences, SENTENCE_EXCLUDED_SITES_KEY, SENTENCES_PER_PAGE, sentencesPerPage } from '@/utils/scripts/pageSentences';
import { badgeModeOf, PAGE_LEVEL_BADGE_MODES } from '@/utils/scripts/extensionBadge';
import { elementsFor, selectorFor } from './elementSelector';
import {
	activePageLanguage,
	languageOfAttribute,
	onPageLanguageChange,
	sentenceKept,
	textByLanguage,
	type LanguageRules,
} from 'cjk-highlighter';
import { languageRules, UNCLEAR_TEXT_SITES_KEY } from '@/utils/scripts/textLanguageSettings';
import { wkPeers } from './pagePeers';
import TinySegmenter from 'tiny-segmenter';

let segmenter: TinySegmenter | null = null;
/** Words / Mixed: the page's text split into words, as its highlighter does */
function segmentWords(text: string): string[] {
	if (!segmenter) segmenter = new TinySegmenter();
	return segmenter.segment(text);
}

/** what's counted follows the highlight: kanji, or words and the kanji outside them */
let countWords = false;

/** after the page changes, wait this long for it to settle */
const RECOMPUTE_DELAY_MS = 1500;
/** the same page is sent to the history at most this often (it changes as it loads) */
const RECORD_EVERY_MS = 10_000;

export const pageStatsState = reactive({
	stats: null as PageStats | null,
	/** the bar is on, the site isn't hidden, the page has enough kanji */
	showBar: false,
	view: 'jlpt' as PageStatsView,
	appearance: {} as Record<string, string>,
	expanded: false,
	/** the parts of this site chosen to rate (selectors; none: the whole page) */
	sections: [] as string[],
	/** how many of them are on this page (0: the whole page is rated) */
	sectionsFound: 0,
	/** choosing parts: the outline under the pointer (on a chosen part: clicking removes it) */
	picking: false,
	pickBox: null as null | Box,
	pickRemoves: false,
	/** the chosen parts on this page: outlined while choosing (or while the bar is hovered), uncovered in focus */
	chosenBoxes: [] as Box[],
	previewing: false,
	/** focus: everything but the chosen parts is dimmed */
	focus: false,
});

type Box = { top: number; left: number; width: number; height: number };

function boxOf(element: Element): Box {
	const rect = element.getBoundingClientRect();
	return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

let tables: PageStatsTables | null = null;
/**
 * Japanese or Chinese (Settings → Highlight): what the highlight leaves out isn't read either, so
 * the level, the history and the sentences are of the same text. Null: nothing left out.
 */
let rules: LanguageRules | null = null;
/** the page's language, as last read (unclear sentences follow it) */
let readLanguage: 'japanese' | 'chinese' | null = null;
let barWanted = false;
let historyWanted = false;
/** with the history: a few sentences from the page (not on the sites left out) */
let sentencesWanted = false;
/** how many (Settings → Reading → Sentences per page) */
let sentenceLimit = SENTENCES_PER_PAGE;
/** the extension icon's badge shows the page's JLPT level, or Jōyō grade (Settings → General → Extension icon) */
let levelBadgeWanted = false;
let levelBadgeJoyo = false;
let lastLevelSent: string | null = null;
let blocked = false;
let hiddenHere = false;
let observer: MutationObserver | null = null;
let timer: number | null = null;
let ui: { mount(): void } | null = null;
let context: ContentScriptContext | null = null;
let lastRecord = { url: '', key: '', at: 0 };

/**
 * This visit of the page: everything it has shown so far, not only what's in it now. Pages that
 * load more as you scroll (feeds, comments, search results), or drop what scrolled away, are rated
 * on all of it, and their sentences chosen from all of it. Starts over on another address (a site
 * that changes pages without loading one, e.g. YouTube) or other chosen parts.
 */
let visit = { url: '', parts: '', lines: new Set<string>(), length: 0, sentences: new Set<string>() };
/** the visit's text is kept up to this (as long as a page is ever read: MAX_TEXT_LENGTH) */
const MAX_VISIT_TEXT = 300_000;
const MAX_VISIT_SENTENCES = 500;

function currentVisit() {
	const url = pageKey(location.href);
	const parts = pageStatsState.sectionsFound ? pageStatsState.sections.join('\n') : '';
	if (visit.url !== url || visit.parts !== parts) {
		visit = { url, parts, lines: new Set(), length: 0, sentences: new Set() };
	}
	return visit;
}

/** The page's text now, added to what this visit has shown before: all of it. */
function visitText(text: string): string {
	const seen = currentVisit();
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || seen.lines.has(trimmed) || seen.length + trimmed.length > MAX_VISIT_TEXT) continue;
		seen.lines.add(trimmed);
		seen.length += trimmed.length + 1;
	}
	return [...seen.lines].join('\n');
}
/** Settings → Focus remembers: this page only, or the whole site (FOCUS_SITES_KEY) */
let focusPerSite = false;
/** focus was turned on / off on this page: the site's saved choice doesn't override it */
let focusChosenHere = false;

export async function mountPageStats(ctx: ContentScriptContext): Promise<void> {
	context = ctx;
	await refresh();
	storage.watch('local:settings', refresh);
	storage.watch('local:highlightData', refresh);
	storage.watch('local:blacklist', refresh);
	storage.watch('local:whitelist', refresh);
	storage.watch(HIDDEN_SITES_KEY, refresh);
	storage.watch(SECTIONS_KEY, refresh);
	storage.watch(FOCUS_SITES_KEY, refresh);
	storage.watch(SENTENCE_EXCLUDED_SITES_KEY, refresh);
	storage.watch(UNCLEAR_TEXT_SITES_KEY, refresh);
	// a Chinese highlighter came or left: read again, with its part left out or back
	let partner = '';
	wkPeers().onChange(() => {
		const now = wkPeers().partner()?.id ?? '';
		if (now === partner) return;
		partner = now;
		void refresh();
	});
	// the highlight found the page's language (or another one): read again with it
	onPageLanguageChange(() => {
		if (rules && observer) schedule();
	});
	// the badge's choice changed (background): the level again
	browser.runtime.onMessage.addListener(message => {
		if (message?.type !== 'wkh:badgeResend') return;
		// the new choice may still be being read here: after it
		void refreshing.then(() => {
			if (!levelBadgeWanted) return;
			lastLevelSent = null;
			const stats = pageStatsState.stats;
			const level = stats && stats.total >= minimumKanji() ? (levelBadgeJoyo ? joyoLevel(stats.joyo, stats.total) : stats.level) : '';
			sendLevelBadge(level);
		});
	});
}

/** the settings being read again (a change): the badge's resend waits for it */
let refreshing: Promise<void> = Promise.resolve();

function refresh(): Promise<void> {
	refreshing = readSettingsAndCompute();
	return refreshing;
}

async function readSettingsAndCompute(): Promise<void> {
	const [settings, data, blacklist, whitelist, hidden, sections, focusSites, sentenceExcluded, unclearTextSites] = await Promise.all([
		storage.getItem<any>('local:settings'),
		storage.getItem<HighlightData>('local:highlightData'),
		storage.getItem<string[]>('local:blacklist'),
		storage.getItem<string[]>('local:whitelist'),
		storage.getItem<string[]>(HIDDEN_SITES_KEY),
		storage.getItem<Record<string, string[]>>(SECTIONS_KEY),
		storage.getItem<string[]>(FOCUS_SITES_KEY),
		storage.getItem<string[]>(SENTENCE_EXCLUDED_SITES_KEY),
		storage.getItem<string[]>(UNCLEAR_TEXT_SITES_KEY),
	]);
	pageStatsState.sections = sections?.[location.hostname] ?? [];
	// a part was added / removed while choosing (or from the hovered panel): outline the new set
	if (tracking()) updateOutlines();
	const config = settings?.page_stats ?? {};
	focusPerSite = config.focus_memory === 'site';
	// a site where focus was left on: on again, unless chosen otherwise on this page
	if (focusPerSite && !focusChosenHere && (focusSites ?? []).includes(location.hostname) && !pageStatsState.focus) {
		setFocus(true, { remember: false });
	}
	barWanted = config.show_bar === true;
	historyWanted = config.history === true;
	sentencesWanted = historyWanted && config.sentences === true
		&& !(sentenceExcluded ?? []).includes(location.hostname);
	sentenceLimit = sentencesPerPage(settings);
	levelBadgeWanted = PAGE_LEVEL_BADGE_MODES.has(badgeModeOf(settings));
	levelBadgeJoyo = badgeModeOf(settings) === 'reading_joyo';
	lastLevelSent = null;
	pageStatsState.view = resolvePageStatsView(settings);
	countWords = (settings?.highlighter?.target ?? 'kanji') !== 'kanji';
	pageStatsState.appearance = settings?.appearance ?? {};
	const listMode: PageListMode = settings?.highlighter?.page_list_mode === 'whitelist' ? 'whitelist' : 'blacklist';
	// the extension is kept off this site: nothing here either
	blocked = isPageHighlightBlocked(location.hostname, listMode, blacklist, whitelist);
	hiddenHere = (hidden ?? []).includes(location.hostname);
	tables = data ? buildPageStatsTables(data) : null;
	// shared with a Chinese highlighter (HanziHero Companion): its text isn't this one's to read
	rules = languageRules(settings, (data as any)?.kanji, unclearTextSites, location.hostname, false, wkPeers().partner());

	const active = (barWanted || historyWanted || levelBadgeWanted) && !blocked && tables != null;
	if (!active) {
		stop();
		pageStatsState.stats = null;
		updateVisibility();
		return;
	}
	start();
	compute();
}

function start(): void {
	if (observer || !document.body) return;
	observer = new MutationObserver(schedule);
	observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function stop(): void {
	observer?.disconnect();
	observer = null;
	if (timer !== null) clearTimeout(timer);
	timer = null;
}

function schedule(): void {
	if (timer !== null) return;
	timer = window.setTimeout(() => {
		timer = null;
		compute();
	}, RECOMPUTE_DELAY_MS);
}

/** The chosen parts of the site, when this page has them; else the whole page. */
function textToRate(): { text: string; parts: Element[] } {
	const parts = pageStatsState.sections.length ? elementsFor(pageStatsState.sections) : [];
	pageStatsState.sectionsFound = parts.length;
	const roots = parts.length ? parts : [document.body];
	return { text: roots.map(readableText).join('\n'), parts };
}

/** not read: furigana (<rt>, or elements named so: Jisho's sentences), and what isn't text */
const FURIGANA = 'ruby, [class*="furigana"]';
const NOT_READ = 'rt, rp, [class*="furigana"], script, style, noscript, template';
const BLOCK = 'p, div, li, dd, dt, td, th, h1, h2, h3, h4, h5, h6, blockquote, figcaption, caption, section, article, br';

/**
 * An element's text as read: its innerText, except on pages with furigana (innerText puts the
 * readings inline: 寺てらに来きた…), where the text nodes are joined without them, a line per block.
 */
function readableText(root: Element): string {
	if (!root.querySelector(FURIGANA)) return (root as HTMLElement).innerText ?? root.textContent ?? '';
	let text = '';
	let block: Element | null = null;
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode: node => (node.parentElement?.closest(NOT_READ) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
	});
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const nodeBlock = node.parentElement?.closest(BLOCK) ?? null;
		if (nodeBlock !== block) {
			text += '\n';
			block = nodeBlock;
		}
		text += node.nodeValue ?? '';
	}
	return text;
}

/** The page (or all its chosen parts) says it's Chinese (`lang="zh…"`). */
function declaredChinese(parts: Element[]): boolean {
	const isChinese = (element: Element) => /^zh\b/i.test(element.closest('[lang]')?.getAttribute('lang') ?? '');
	return parts.length ? parts.every(isChinese) : isChinese(document.body);
}

function compute(): void {
	if (!tables || !document.body) return;
	const { text, parts } = textToRate();
	// a Chinese page isn't rated (nor kept in the history): its hanzi aren't Japanese to read.
	// Only what the page says: a page of kanji with no kana (a study list) is still Japanese.
	if (declaredChinese(parts)) {
		notRated();
		return;
	}
	// all this visit has shown (what loaded as the page was used, too), as the highlight reads it
	let read = visitText(text);
	if (rules) {
		// the page's language: what it says, else the highlight's (it reads all the page, hidden
		// parts too), else this text's
		const page = languageOfAttribute(parts[0] ?? document.body) ?? activePageLanguage() ?? null;
		const byLanguage = textByLanguage(read, rules, page);
		read = byLanguage.text;
		readLanguage = byLanguage.page;
		// a Chinese page, while Chinese isn't highlighted: not rated, nor kept in the history
		if (readLanguage === 'chinese' && rules.chinese === 'skip') {
			notRated();
			return;
		}
	}
	const stats = {
		...computePageStats(read, tables, countWords ? segmentWords : undefined),
		partial: pageStatsState.sectionsFound > 0,
	};
	pageStatsState.stats = stats;
	// the page changed: the parts may have moved (or appeared)
	if (tracking()) updateOutlines();
	updateVisibility();
	if (historyWanted && stats.total >= minimumKanji()) record(stats);
	const pageLevel = levelBadgeJoyo ? joyoLevel(stats.joyo, stats.total) : stats.level;
	sendLevelBadge(stats.total >= minimumKanji() ? pageLevel : '');
}

/** A page that isn't rated (Chinese): no bar, no level on the badge, nothing sent to the history. */
function notRated(): void {
	pageStatsState.stats = null;
	sendLevelBadge('');
	if (tracking()) updateOutlines();
	updateVisibility();
}

/** The page's JLPT level for the extension icon's badge (when that's its choice), when it changes. */
function sendLevelBadge(level: string): void {
	if (!levelBadgeWanted || level === lastLevelSent) return;
	lastLevelSent = level;
	try {
		void browser.runtime.sendMessage({ type: 'wkh:badgeLevel', level }).catch(() => {});
	} catch {
		/* extension context may be gone (reloaded extension) */
	}
}

/** Chosen parts were found: they're what was asked for, however short. */
function minimumKanji(): number {
	return pageStatsState.sectionsFound ? 1 : MIN_PAGE_KANJI;
}

function updateVisibility(): void {
	const show = barWanted && !blocked && !hiddenHere && (pageStatsState.stats?.total ?? 0) >= minimumKanji();
	pageStatsState.showBar = show;
	if (!show) pageStatsState.expanded = false;
	if (show) void ensureMounted();
}

let recordTimer: number | null = null;

function record(stats: PageStats): void {
	const url = pageKey(location.href);
	const counts = unitCounts(stats);
	const key = `${stats.total}:${counts.learned}:${counts.notLearned}:${stats.unit ?? 'kanji'}:${stats.partial ? 'part' : 'all'}`;
	const now = Date.now();
	if (url === lastRecord.url && key === lastRecord.key) return;
	// changed again soon after (still loading, or other parts chosen): the latest, a bit later
	if (url === lastRecord.url && now - lastRecord.at < RECORD_EVERY_MS) {
		if (recordTimer !== null) clearTimeout(recordTimer);
		recordTimer = window.setTimeout(() => {
			recordTimer = null;
			if (pageStatsState.stats) record(pageStatsState.stats);
		}, RECORD_EVERY_MS - (now - lastRecord.at));
		return;
	}
	lastRecord = { url, key, at: now };
	try {
		void browser.runtime.sendMessage({
			type: 'wkh:pageHistory:record',
			entry: { url, title: document.title || location.hostname, host: location.hostname, at: now, stats, sentences: pageSentences() },
		}).catch(() => {});
	} catch {
		/* extension context may be gone (reloaded extension) */
	}
}

/** The sentences to keep with the page (pageSentences.ts): from what's rated (the chosen parts, else the content). */
function pageSentences(): string[] | undefined {
	if (!sentencesWanted || !tables) return undefined;
	try {
		const parts = pageStatsState.sections.length ? elementsFor(pageStatsState.sections) : [];
		// chosen from all the sentences this visit has shown, not only those on the page now
		const seen = currentVisit();
		for (const sentence of extractSentences(parts)) {
			if (seen.sentences.size >= MAX_VISIT_SENTENCES) break;
			// left out of the highlight (Chinese, say): not an example of Japanese either
			if (rules && !sentenceKept(sentence, rules, readLanguage)) continue;
			seen.sentences.add(sentence);
		}
		return chooseSentences([...seen.sentences], tables, { limit: sentenceLimit, segment: countWords ? segmentWords : undefined });
	} catch {
		return undefined;
	}
}

/** Only pages that show the bar get its element. */
async function ensureMounted(): Promise<void> {
	if (ui || !context) return;
	const created = await createShadowRootUi<App>(context, {
		name: 'wkh-page-stats',
		position: 'overlay',
		zIndex: 2147483646,
		anchor: 'body',
		append: 'last',
		onMount(container) {
			const app = createApp(PageStatsBar);
			app.mount(container);
			return app;
		},
		onRemove(app) {
			app?.unmount();
		},
	});
	ui = created;
	created.mount();
	shadowHost = (created as any).shadowHost ?? null;
}

let shadowHost: Element | null = null;

/* ------------------------------------------------------------------ */
/* Choosing the parts of the site to rate                              */
/* ------------------------------------------------------------------ */

function isOwnUi(event: Event): boolean {
	return Boolean(shadowHost && event.composedPath().includes(shadowHost));
}

function pickTarget(event: MouseEvent): Element | null {
	const target = event.target instanceof Element ? event.target : null;
	if (!target || target === document.body || target === document.documentElement) return null;
	return target;
}

/** The chosen part (and its selector) the element is in, if any. */
function chosenPartOf(element: Element): { element: Element; selector: string } | null {
	for (const selector of pageStatsState.sections) {
		try {
			for (const part of document.querySelectorAll(selector)) {
				if (part.contains(element)) return { element: part, selector };
			}
		} catch {
			/* a selector the page can't use anymore */
		}
	}
	return null;
}

let lastPointer: MouseEvent | null = null;

function onPickMove(event: MouseEvent): void {
	lastPointer = event;
	if (isOwnUi(event)) {
		pageStatsState.pickBox = null;
		return;
	}
	const target = pickTarget(event);
	if (!target) return;
	const chosen = chosenPartOf(target);
	pageStatsState.pickRemoves = Boolean(chosen);
	pageStatsState.pickBox = boxOf(chosen?.element ?? target);
}

/** The page doesn't get the click (no link opening while choosing). */
function onPickClick(event: MouseEvent): void {
	if (isOwnUi(event)) return;
	event.preventDefault();
	event.stopPropagation();
	if (event.type !== 'click') return;
	const target = pickTarget(event);
	if (!target) return;
	// a chosen part (or inside one): clicking it again takes it out
	const chosen = chosenPartOf(target);
	void (chosen ? removeSection(chosen.selector) : addSection(selectorFor(target)));
}

function onPickKey(event: KeyboardEvent): void {
	if (event.key === 'Escape') stopPicking();
}

/** The outlines are fixed to the window: they follow the page as it scrolls. */
let outlineFrame: number | null = null;
function updateOutlines(): void {
	if (outlineFrame !== null) return;
	outlineFrame = requestAnimationFrame(() => {
		outlineFrame = null;
		if (!tracking()) return;
		pageStatsState.chosenBoxes = elementsFor(pageStatsState.sections).map(boxOf);
		if (pageStatsState.picking && lastPointer) onPickMove(lastPointer);
	});
}

/** Choosing, previewing and focus all need the parts' places on screen, as the page scrolls. */
function tracking(): boolean {
	return pageStatsState.picking || pageStatsState.previewing || pageStatsState.focus;
}

let trackingOn = false;
function updateTracking(): void {
	const on = tracking();
	if (on === trackingOn) {
		if (on) updateOutlines();
		return;
	}
	trackingOn = on;
	if (on) {
		window.addEventListener('scroll', updateOutlines, true);
		window.addEventListener('resize', updateOutlines);
		updateOutlines();
	} else {
		window.removeEventListener('scroll', updateOutlines, true);
		window.removeEventListener('resize', updateOutlines);
		pageStatsState.chosenBoxes = [];
	}
}

/** Hovering the bar: the parts it rates are outlined, as when choosing them. */
export function previewSections(on: boolean): void {
	if (pageStatsState.picking || on === pageStatsState.previewing) return;
	pageStatsState.previewing = on;
	updateTracking();
}

export function startPicking(): void {
	previewSections(false);
	pageStatsState.expanded = false;
	pageStatsState.picking = true;
	document.addEventListener('mousemove', onPickMove, true);
	for (const type of ['click', 'mousedown', 'mouseup', 'pointerdown']) document.addEventListener(type, onPickClick as EventListener, true);
	document.addEventListener('keydown', onPickKey, true);
	updateTracking();
}

export function stopPicking(): void {
	pageStatsState.picking = false;
	pageStatsState.pickBox = null;
	lastPointer = null;
	document.removeEventListener('mousemove', onPickMove, true);
	for (const type of ['click', 'mousedown', 'mouseup', 'pointerdown']) document.removeEventListener(type, onPickClick as EventListener, true);
	document.removeEventListener('keydown', onPickKey, true);
	updateTracking();
	pageStatsState.expanded = true;
}

/* ------------------------------------------------------------------ */
/* Focus: the chosen parts stay, the rest of the page is dimmed         */
/* ------------------------------------------------------------------ */

function onFocusKey(event: KeyboardEvent): void {
	if (event.key === 'Escape' && !pageStatsState.picking) setFocus(false);
}

/**
 * Turned on / off. `remember`: in "whole site" mode, the site is saved (or forgotten) so its
 * other pages open focused too.
 */
export function setFocus(on: boolean, { remember = true } = {}): void {
	if (remember) focusChosenHere = true;
	if (on !== pageStatsState.focus) {
		pageStatsState.focus = on;
		if (on) document.addEventListener('keydown', onFocusKey, true);
		else document.removeEventListener('keydown', onFocusKey, true);
		updateTracking();
	}
	if (remember && focusPerSite) void rememberFocus(on);
}

async function rememberFocus(on: boolean): Promise<void> {
	const sites = (await storage.getItem<string[]>(FOCUS_SITES_KEY)) ?? [];
	const next = on ? [...new Set([...sites, location.hostname])] : sites.filter(site => site !== location.hostname);
	if (next.length !== sites.length) await storage.setItem(FOCUS_SITES_KEY, next);
}

async function saveSections(next: string[]): Promise<void> {
	const all = (await storage.getItem<Record<string, string[]>>(SECTIONS_KEY)) ?? {};
	if (next.length) all[location.hostname] = next;
	else delete all[location.hostname];
	await storage.setItem(SECTIONS_KEY, all);
}

async function addSection(selector: string): Promise<void> {
	if (pageStatsState.sections.includes(selector)) return;
	await saveSections([...pageStatsState.sections, selector]);
}

export async function removeSection(selector: string): Promise<void> {
	await saveSections(pageStatsState.sections.filter(entry => entry !== selector));
}

export async function clearSections(): Promise<void> {
	await saveSections([]);
}

/** "Hide on this site" (Settings lists them, to show them again). */
export async function hideOnThisSite(): Promise<void> {
	const hidden = (await storage.getItem<string[]>(HIDDEN_SITES_KEY)) ?? [];
	if (!hidden.includes(location.hostname)) await storage.setItem(HIDDEN_SITES_KEY, [...hidden, location.hostname]);
}

/** The bar's choice of what to show while closed, saved like the setting. */
export async function setPageStatsView(view: PageStatsView): Promise<void> {
	pageStatsState.view = view;
	const settings = (await storage.getItem<any>('local:settings')) ?? {};
	await storage.setItem('local:settings', { ...settings, page_stats: { ...(settings.page_stats ?? {}), view } });
}

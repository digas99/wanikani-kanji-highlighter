/**
 * Content-script orchestration for the kanji highlighter.
 *
 * Two strategies are supported and chosen from the popup settings:
 *   - "full":     highlight the whole page immediately, then react to DOM changes.
 *   - "viewport": only highlight elements as they scroll into view, and pick up
 *                 newly added kanji dynamically.
 *
 * Highlight data (which kanji are learned / not learned) is produced by the
 * WaniKani store and mirrored into extension storage, so the content script
 * stays a lightweight reader.
 */

import { storage } from '#imports';
import { KanjiHighlighter, clearHighlights, HIGHLIGHT_MARK_CLASS } from './highlighter';
import { buildHighlightConfig } from './highlightConfig';
import { buildSrsStageCss } from './srsStageHighlight';
import {
	buildSchoolGradeCss,
	JLPT_GRADE_SECTIONS,
	JOYO_GRADE_SECTIONS,
} from './schoolGradeHighlight';
import { isPageHighlightBlocked,
	type PageListMode,
} from '@/utils/scripts/pageList';
import { isKanjiCounterEnabled } from '@/utils/scripts/extensionBadge';

type HighlightData = {
	kanji: {
		learned: string;
		notLearned: string;
		byStage?: Record<string, string>;
		byJlpt?: Record<string, string>;
		byJoyo?: Record<string, string>;
	};
	vocabulary: { learned: string[]; notLearned: string[]; byStage?: Record<string, string[]> };
	updatedAt: number;
};

const STYLE_ID = 'wkhighlighter-styles';
const IDLE_DELAY = 200;

const UNWANTED_TAGS = new Set([
	'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
	'CODE', 'PRE', 'KBD', 'SAMP', 'TITLE', 'HEAD', 'SVG', 'IMG', 'CANVAS',
	'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'MATH',
]);

let highlighter: KanjiHighlighter | null = null;
let mutationObserver: MutationObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let mode: 'full' | 'viewport' = 'viewport';
let kanjiCounterEnabled = true;
let observed = new WeakSet<Element>();
let flushTimer: number | null = null;
let badgeTimer: number | null = null;
let pendingRoots: Node[] = [];
let reinitTimer: number | null = null;

/** Entry point invoked by the content script. */
export async function runHighlighter(): Promise<void> {
	// Always answer the popup, even when highlighting is disabled on this page.
	// WXT's `browser` is the native namespace, so respond synchronously via
	// sendResponse (returning a Promise would not deliver a response).
	browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
		if (message?.type === 'wkh:getKanji') {
			sendResponse({ items: getHighlightedItems() });
		}
	});

	await init();

	storage.watch('local:settings', scheduleReinit);
	storage.watch('local:highlightData', scheduleReinit);
	storage.watch('local:blacklist', scheduleReinit);
	storage.watch('local:whitelist', scheduleReinit);
}

/** Snapshot of the items highlighted on the current page (for the popup). */
export function getHighlightedItems() {
	return highlighter?.getHighlighted() ?? [];
}

function scheduleReinit(): void {
	if (reinitTimer !== null) clearTimeout(reinitTimer);
	reinitTimer = window.setTimeout(() => {
		reinitTimer = null;
		void init();
	}, 150);
}

async function init(): Promise<void> {
	teardown();

	const [settings, data, blacklist, whitelist] = await Promise.all([
		storage.getItem<any>('local:settings'),
		storage.getItem<HighlightData>('local:highlightData'),
		storage.getItem<string[]>('local:blacklist'),
		storage.getItem<string[]>('local:whitelist'),
	]);

	if (!settings) return;

	const config = buildHighlightConfig(settings, data);
	if (!config) return;

	const pageListMode: PageListMode = settings.highlighter?.page_list_mode === 'whitelist'
		? 'whitelist'
		: 'blacklist';
	if (isPageHighlightBlocked(location.hostname, pageListMode, blacklist, whitelist)) return;

	highlighter = new KanjiHighlighter(config);
	if (!highlighter.isActive()) {
		highlighter = null;
		return;
	}

	const highlighterSettings = settings.highlighter ?? {};
	const style = settings.highlight_style ?? {};
	injectStyles(settings.appearance ?? {}, config.colorBy, style.learned || 'wkhighlighter_highlighted');
	kanjiCounterEnabled = isKanjiCounterEnabled(settings);
	mode = highlighterSettings.mode === 'full' ? 'full' : 'viewport';
	observed = new WeakSet<Element>();

	if (mode === 'full') startFullMode();
	else startViewportMode();
}

function teardown(): void {
	if (mutationObserver) { mutationObserver.disconnect(); mutationObserver = null; }
	if (intersectionObserver) { intersectionObserver.disconnect(); intersectionObserver = null; }
	if (flushTimer !== null) { clearTimeout(flushTimer); flushTimer = null; }
	if (badgeTimer !== null) { clearTimeout(badgeTimer); badgeTimer = null; }
	pendingRoots = [];
	if (highlighter) clearHighlights();
	highlighter = null;
	removeStyles();
	if (kanjiCounterEnabled) sendBadge(0);
}

/* ------------------------------------------------------------------ */
/* Full-page mode                                                     */
/* ------------------------------------------------------------------ */

function startFullMode(): void {
	highlighter!.highlightRoot(document.body);
	reportBadge();

	mutationObserver = new MutationObserver(mutations => {
		for (const mutation of mutations) {
			mutation.addedNodes.forEach(node => pendingRoots.push(node));
		}
		scheduleFullFlush();
	});
	mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function scheduleFullFlush(): void {
	if (flushTimer !== null) return;
	flushTimer = window.setTimeout(() => {
		flushTimer = null;
		const roots = pendingRoots;
		pendingRoots = [];
		if (!highlighter) return;
		for (const node of roots) {
			if (!node.isConnected) continue;
			if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
				highlighter.highlightRoot(node);
			}
		}
		reportBadge();
	}, IDLE_DELAY);
}

/* ------------------------------------------------------------------ */
/* Viewport mode                                                      */
/* ------------------------------------------------------------------ */

function startViewportMode(): void {
	intersectionObserver = new IntersectionObserver(onIntersect, {
		rootMargin: '150px 0px',
		threshold: 0,
	});

	observeCandidates(document.body);
	reportBadge();

	mutationObserver = new MutationObserver(mutations => {
		for (const mutation of mutations) {
			mutation.addedNodes.forEach(node => {
				if (node.nodeType === Node.ELEMENT_NODE) {
					observeCandidates(node as Element);
				} else if (node.nodeType === Node.TEXT_NODE && node.parentElement && !isUnwanted(node.parentElement)) {
					// Text appended to an already-processed element: highlight it directly.
					highlighter?.highlightRoot(node);
					reportBadge();
				}
			});
		}
	});
	mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function onIntersect(entries: IntersectionObserverEntry[]): void {
	if (!highlighter) return;
	let changed = false;
	for (const entry of entries) {
		if (!entry.isIntersecting) continue;
		const target = entry.target;
		intersectionObserver?.unobserve(target);
		highlighter.highlightRoot(target);
		changed = true;
	}
	if (changed) reportBadge();
}

/** Find text-bearing elements in a subtree and observe them for visibility. */
function observeCandidates(root: Element): void {
	if (!highlighter || !intersectionObserver) return;
	if (isUnwanted(root)) return;

	if (isCandidate(root)) observeElement(root);

	const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
		acceptNode: element => {
			if (isUnwanted(element as Element)) return NodeFilter.FILTER_REJECT;
			return isCandidate(element as Element)
				? NodeFilter.FILTER_ACCEPT
				: NodeFilter.FILTER_SKIP;
		},
	});

	let current = walker.nextNode();
	while (current) {
		observeElement(current as Element);
		current = walker.nextNode();
	}
}

function observeElement(element: Element): void {
	if (!intersectionObserver || observed.has(element)) return;
	observed.add(element);
	intersectionObserver.observe(element);
}

/** An element is a candidate when it directly holds text with a kanji match. */
function isCandidate(element: Element): boolean {
	if (!highlighter) return false;
	for (const node of Array.from(element.childNodes)) {
		if (node.nodeType === Node.TEXT_NODE && node.nodeValue && highlighter.hasMatch(node.nodeValue)) {
			return true;
		}
	}
	return false;
}

function isUnwanted(element: Element): boolean {
	return UNWANTED_TAGS.has(element.tagName)
		|| (element as HTMLElement).isContentEditable
		|| element.classList.contains(HIGHLIGHT_MARK_CLASS);
}

/* ------------------------------------------------------------------ */
/* Badge + styling                                                    */
/* ------------------------------------------------------------------ */

function reportBadge(): void {
	if (badgeTimer !== null) return;
	badgeTimer = window.setTimeout(() => {
		badgeTimer = null;
		if (highlighter) sendBadge(highlighter.getCount());
	}, 300);
}

function sendBadge(count: number): void {
	if (!kanjiCounterEnabled) return;

	try {
		browser.runtime.sendMessage({ type: 'wkh:badge', count }).catch(() => {});
	} catch {
		/* extension context may be gone during navigation */
	}
}

function injectStyles(
	appearance: Record<string, string>,
	colorBy: 'learned' | 'srs_stage' | 'jlpt' | 'joyo',
	srsStyleClass: string,
): void {
	removeStyles();
	const learned = appearance.highlight_learned || '#00aaff';
	const notLearned = appearance.highlight_not_learned || '#f100a1';

	const markLayout = `
.wkhighlighter_highlighted,
.wkhighlighter_highlightedNotLearned,
.wkhighlighter_highlighted_underlined,
.wkhighlighter_highlighted_bold,
.wkhighlighter_highlightedNotLearned_underlined,
.wkhighlighter_highlightedNotLearned_bold,
.wkhighlighter_highlighted_nostyle,
.wkhighlighter_highlightedNotLearned_nostyle {
	display: inline !important;
	font-family: inherit !important;
	font-size: inherit !important;
	font-style: inherit !important;
	font-weight: inherit !important;
	line-height: inherit !important;
	letter-spacing: inherit !important;
	word-break: inherit !important;
	vertical-align: baseline !important;
	box-decoration-break: clone;
	-webkit-box-decoration-break: clone;
}`;

	const shared = `
.wkhighlighter_clickable { transition: opacity 0.2s ease; cursor: pointer; }
.wkhighlighter_clickable:not(.wkhighlighter_hoverable):hover { opacity: 0.6 !important; }
${markLayout}
.wkhighlighter_highlighted,
.wkhighlighter_highlightedNotLearned {
	color: #fff !important;
	border-radius: 3px;
	padding: 0 1px;
}
.wkhighlighter_highlighted_nostyle,
.wkhighlighter_highlightedNotLearned_nostyle { cursor: pointer; }
.wkhighlighter_highlighted_underlined,
.wkhighlighter_highlightedNotLearned_underlined {
	color: inherit !important;
	background: transparent !important;
}
.wkhighlighter_highlighted_bold,
.wkhighlighter_highlightedNotLearned_bold {
	background: transparent !important;
}
`;

	const style = document.createElement('style');
	style.id = STYLE_ID;

	if (colorBy === 'srs_stage' || colorBy === 'jlpt' || colorBy === 'joyo') {
		const base = srsStyleClass.replace(/_(underlined|bold|nostyle)$/, '');
		const variants = [
			base,
			`${base}_underlined`,
			`${base}_bold`,
			`${base}_nostyle`,
		];
		const gradeCss = colorBy === 'jlpt'
			? variants.map(v => buildSchoolGradeCss(v, JLPT_GRADE_SECTIONS)).join('\n')
			: colorBy === 'joyo'
				? variants.map(v => buildSchoolGradeCss(v, JOYO_GRADE_SECTIONS)).join('\n')
				: '';
		const srsCss = colorBy === 'srs_stage'
			? variants.map(v => buildSrsStageCss(v, appearance)).join('\n')
			: '';
		style.textContent = `${shared}\n${srsCss}${gradeCss}`;
	} else {
		style.textContent = `${shared}
.wkhighlighter_highlighted { background-color: ${learned} !important; }
.wkhighlighter_highlightedNotLearned { background-color: ${notLearned} !important; }
.wkhighlighter_highlighted_underlined { border-bottom: 2px solid ${learned} !important; }
.wkhighlighter_highlightedNotLearned_underlined { border-bottom: 2px solid ${notLearned} !important; }
.wkhighlighter_highlighted_bold { color: ${learned} !important; font-weight: bold !important; }
.wkhighlighter_highlightedNotLearned_bold { color: ${notLearned} !important; font-weight: bold !important; }
`;
	}

	(document.head || document.documentElement).appendChild(style);
}

function removeStyles(): void {
	document.getElementById(STYLE_ID)?.remove();
}

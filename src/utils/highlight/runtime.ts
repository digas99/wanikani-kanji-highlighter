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
 *
 * Where the browser supports it, matches are painted (CSS Custom Highlight API, see
 * rangeHighlights.ts) and the page's text is left alone; otherwise they're wrapped in spans.
 */

import { storage } from '#imports';
import { KanjiHighlighter, clearHighlights, HIGHLIGHT_MARK_CLASS, type HighlightConfig } from './highlighter';
import { buildHighlightConfig } from './highlightConfig';
import { buildSrsStageCss, getSrsStageColor, SRS_STAGE_SECTIONS } from './srsStageHighlight';
import {
	buildSchoolGradeCss,
	JLPT_GRADE_SECTIONS,
	JOYO_GRADE_SECTIONS,
} from './schoolGradeHighlight';
import { HOVER_HIGHLIGHT, RangeHighlights, supportsRangeHighlights } from './rangeHighlights';
import { highlightAt, setRangeHitTest } from './highlightHits';
import { isPageHighlightBlocked,
	type PageListMode,
} from '@/utils/scripts/pageList';
import { LanguageGate, languageRules } from './textLanguage';
import { isDevInstall, mountLanguageDebug, unmountLanguageDebug } from './languageDebug';
import { UNCLEAR_TEXT_SITES_KEY } from '@/utils/scripts/textLanguageSettings';
import { isKanjiCounterEnabled } from '@/utils/scripts/extensionBadge';
import {
	clearSubjectBundleCache,
	prefetchHighlightedSubjects,
	warmupSubjectLookup,
} from './detailsPopupSubject';

type HighlightData = {
	kanji: {
		learned: string;
		notLearned: string;
		byStage?: Record<string, string>;
		byJlpt?: Record<string, string>;
		byJoyo?: Record<string, string>;
		japanese?: string;
	};
	vocabulary: {
		learned: string[];
		notLearned: string[];
		/** word → how it conjugates (deinflect.ts) */
		inflections?: Record<string, number>;
		byStage?: Record<string, string[]>;
		byJlpt?: Record<string, string[]>;
		byJoyo?: Record<string, string[]>;
	};
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
/** what each paragraph's language lets through (null: everything, the default) */
let gate: LanguageGate | null = null;
/** painted highlights (null: spans, the fallback) */
let ranges: RangeHighlights | null = null;
let pruneTimer: number | null = null;
let mutationObserver: MutationObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let mode: 'full' | 'viewport' = 'viewport';
let kanjiCounterEnabled = true;
let detailsPopupEnabled = true;
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
		// the badge's choice changed (background): the count again
		if (message?.type === 'wkh:badgeResend' && highlighter) sendBadge(highlighter.getCount());
	});

	await init();

	// Re-highlighting tears the page's highlights down and rebuilds them (a visible
	// flash), so only do it when something that affects highlighting changed:
	// unrelated settings (e.g. the search list layout) and identical data rewrites are ignored.
	storage.watch<any>('local:settings', settings => {
		if (highlightSettingsKey(settings) !== lastSettingsKey) scheduleReinit();
	});
	storage.watch<HighlightData>('local:highlightData', data => {
		if (highlightDataKey(data) !== lastDataKey) scheduleReinit();
	});
	storage.watch('local:blacklist', scheduleReinit);
	storage.watch('local:whitelist', scheduleReinit);
	storage.watch(UNCLEAR_TEXT_SITES_KEY, scheduleReinit);
}

let lastSettingsKey: string | null = null;
let lastDataKey: string | null = null;

/** Only the settings the page highlighter / badge / popup prefetch depend on. */
function highlightSettingsKey(settings: any): string {
	if (!settings) return '';
	return JSON.stringify([
		settings.highlighter,
		settings.highlight_style,
		settings.appearance,
		settings.extension_icon?.kanji_counter,
		settings.extension_icon?.badge,
		settings.kanji_details_popup?.activated,
	]);
}

/** Highlight data minus its timestamp: the store rewrites unchanged data with a new `updatedAt`. */
function highlightDataKey(data: HighlightData | null | undefined): string {
	if (!data) return '';
	const { updatedAt: _ignored, ...rest } = data;
	return JSON.stringify(rest);
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

	const [settings, data, blacklist, whitelist, unclearTextSites] = await Promise.all([
		storage.getItem<any>('local:settings'),
		storage.getItem<HighlightData>('local:highlightData'),
		storage.getItem<string[]>('local:blacklist'),
		storage.getItem<string[]>('local:whitelist'),
		storage.getItem<string[]>(UNCLEAR_TEXT_SITES_KEY),
	]);

	const dataKey = highlightDataKey(data);
	lastSettingsKey = highlightSettingsKey(settings);
	// SRS data changed since the last pass: drop popup previews built from the old data.
	if (lastDataKey !== null && dataKey !== lastDataKey) clearSubjectBundleCache();
	lastDataKey = dataKey;

	if (!settings) return;

	const config = buildHighlightConfig(settings, data);
	if (!config) return;

	const pageListMode: PageListMode = settings.highlighter?.page_list_mode === 'whitelist'
		? 'whitelist'
		: 'blacklist';
	if (isPageHighlightBlocked(location.hostname, pageListMode, blacklist, whitelist)) return;

	ranges = supportsRangeHighlights() ? new RangeHighlights() : null;
	// loaded unpacked: always classified, and shown (languageDebug.ts)
	const dev = await isDevInstall();
	gate = createLanguageGate(settings, data, unclearTextSites, dev);
	highlighter = new KanjiHighlighter(config, ranges, gate);
	if (!highlighter.isActive()) {
		highlighter = null;
		ranges = null;
		gate = null;
		return;
	}
	// the page's language, from its first paragraphs: unclear ones then follow it from the start
	gate?.seed(document.body);
	if (dev && gate) mountLanguageDebug(gate);

	const highlighterSettings = settings.highlighter ?? {};
	const style = settings.highlight_style ?? {};
	injectStyles(settings.appearance ?? {}, config.colorBy, style.learned || 'wkhighlighter_highlighted');
	if (ranges) {
		injectRangeStyles(settings.appearance ?? {}, config);
		const painted = ranges;
		setRangeHitTest((x, y) => painted.hitTest(x, y));
		document.addEventListener('mousemove', onHoverMove, true);
	}
	kanjiCounterEnabled = isKanjiCounterEnabled(settings);
	detailsPopupEnabled = settings.kanji_details_popup?.activated !== false;
	if (detailsPopupEnabled) warmupSubjectLookup();
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
	if (pruneTimer !== null) { clearTimeout(pruneTimer); pruneTimer = null; }
	pendingRoots = [];
	if (ranges) {
		ranges.clear();
		setRangeHitTest(null);
		document.removeEventListener('mousemove', onHoverMove, true);
	} else if (highlighter) {
		clearHighlights();
	}
	ranges = null;
	highlighter = null;
	gate?.dispose();
	gate = null;
	unmountLanguageDebug();
	removeStyles();
	// not running here: no number at all (-1), not a 0 (which would look like it ran)
	if (kanjiCounterEnabled) sendBadge(-1);
}

/* ------------------------------------------------------------------ */
/* Japanese or Chinese (textLanguage.ts)                              */
/* ------------------------------------------------------------------ */

/**
 * Chinese text and text that could be either: highlighted, or left alone (Settings → Highlight).
 * Both highlighted (the default): no gate, nothing classified.
 */
function createLanguageGate(settings: any, data: HighlightData | null, unclearTextSites: string[] | null, dev: boolean): LanguageGate | null {
	// development: classified even when nothing is left out (both highlighted: nothing filtered)
	const rules = languageRules(settings, data?.kanji, unclearTextSites, location.hostname, dev);
	if (!rules) return null;
	return new LanguageGate({
		...rules,
		track: dev,
		// the page's language became clear: the unclear paragraphs decided without it, again
		onPageLanguage: paragraphs => {
			if (!highlighter) return;
			for (const paragraph of paragraphs) highlighter.highlightRoot(paragraph);
			reportBadge();
		},
	});
}

/* ------------------------------------------------------------------ */
/* Full-page mode                                                     */
/* ------------------------------------------------------------------ */

function startFullMode(): void {
	highlighter!.highlightRoot(document.body);
	reportBadge();

	mutationObserver = new MutationObserver(mutations => {
		for (const mutation of mutations) {
			gate?.forget(mutation.target);
			mutation.addedNodes.forEach(node => pendingRoots.push(node));
			// painted: text edited in place (sites update their own text) is highlighted again
			if (mutation.type === 'characterData') pendingRoots.push(mutation.target);
			if (mutation.removedNodes.length) schedulePrune();
		}
		scheduleFullFlush();
	});
	mutationObserver.observe(document.body, observerOptions());
}

/** Spans change the page's text themselves, so only painted highlights follow text edits. */
function observerOptions(): MutationObserverInit {
	return ranges
		? { childList: true, subtree: true, characterData: true }
		: { childList: true, subtree: true };
}

/** Painted highlights of text that left the page (or changed) are dropped, on idle. */
function schedulePrune(): void {
	if (!ranges || pruneTimer !== null) return;
	pruneTimer = window.setTimeout(() => {
		pruneTimer = null;
		if (!ranges || !highlighter) return;
		for (const node of ranges.prune()) highlighter.highlightRoot(node);
	}, 1000);
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
			gate?.forget(mutation.target);
			// painted: text edited in place (sites update their own text) is highlighted again
			if (mutation.type === 'characterData') {
				const node = mutation.target;
				if (node.parentElement && !isUnwanted(node.parentElement)) {
					highlighter?.highlightRoot(node);
					reportBadge();
				}
				continue;
			}
			if (mutation.removedNodes.length) schedulePrune();
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
	mutationObserver.observe(document.body, observerOptions());
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
		if (!highlighter) return;
		sendBadge(highlighter.getCount());
		// Already-requested items are skipped, so this only sends what's new.
		if (detailsPopupEnabled) void prefetchHighlightedSubjects(highlighter.getHighlighted());
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
.wkhighlighter_clickable { transition: opacity 0.2s ease; }
.wkhighlighter_clickable:not(.wkhighlighter_hoverable):hover { opacity: 0.6 !important; }
${markLayout}
.wkhighlighter_highlighted,
.wkhighlighter_highlightedNotLearned {
	color: #fff !important;
	border-radius: 3px;
	padding: 0 1px;
}
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
	document.getElementById(RANGE_STYLE_ID)?.remove();
}

/* ------------------------------------------------------------------ */
/* Painted highlights: styles + hover                                 */
/* ------------------------------------------------------------------ */

const RANGE_STYLE_ID = 'wkhighlighter-range-styles';

type HighlightVariant = 'background' | 'underlined' | 'bold' | 'nostyle';

function variantOf(styleClass: string): HighlightVariant {
	const match = styleClass.match(/_(underlined|bold|nostyle)$/);
	return (match?.[1] as HighlightVariant | undefined) ?? 'background';
}

/**
 * The span styles, as ::highlight rules. Painted text can't change weight, padding or
 * corners: bold becomes a thin shadow in the same color, the background loses its rounding.
 */
function highlightRule(name: string, variant: HighlightVariant, color: string): string {
	if (variant === 'underlined') return `::highlight(${name}) { text-decoration: underline solid ${color} 2px; }`;
	if (variant === 'bold') return `::highlight(${name}) { color: ${color}; text-shadow: 0.03em 0 0 ${color}; }`;
	if (variant === 'nostyle') return '';
	return `::highlight(${name}) { background-color: ${color}; color: #fff; }`;
}

function injectRangeStyles(appearance: Record<string, string>, config: HighlightConfig): void {
	const rules: string[] = [];
	if (config.colorBy === 'srs_stage') {
		const variant = variantOf(config.srsStyleClass);
		for (const section of SRS_STAGE_SECTIONS) {
			rules.push(highlightRule(`wkh-srs-${section.key}`, variant, getSrsStageColor(section.key, appearance)));
		}
	} else if (config.colorBy === 'jlpt' || config.colorBy === 'joyo') {
		const variant = variantOf(config.srsStyleClass);
		const sections = config.colorBy === 'jlpt' ? JLPT_GRADE_SECTIONS : JOYO_GRADE_SECTIONS;
		for (const section of sections) {
			rules.push(highlightRule(`wkh-${config.colorBy}-${section.key}`, variant, section.fallbackColor));
		}
	} else {
		rules.push(highlightRule('wkh-learned', variantOf(config.learnedClass), appearance.highlight_learned || '#00aaff'));
		rules.push(highlightRule('wkh-not-learned', variantOf(config.notLearnedClass), appearance.highlight_not_learned || '#f100a1'));
	}
	// hovered: a light tint over the color (spans used to fade)
	rules.push(`::highlight(${HOVER_HIGHLIGHT}) { background-color: rgba(128, 128, 128, 0.35); }`);

	const style = document.createElement('style');
	style.id = RANGE_STYLE_ID;
	style.textContent = rules.filter(Boolean).join('\n');
	(document.head || document.documentElement).appendChild(style);
}

let pendingHover: MouseEvent | null = null;
function onHoverMove(event: MouseEvent): void {
	if (!pendingHover) {
		requestAnimationFrame(() => {
			const move = pendingHover;
			pendingHover = null;
			if (!move || !ranges) return;
			const hit = highlightAt(move);
			// the cursor stays the page's: a highlight isn't a link
			ranges.setHovered(hit && 'range' in hit ? hit as any : null);
		});
	}
	pendingHover = event;
}

/**
 * Highlighting a page as it's used. Two ways:
 *   - "full":     the whole page at once, then what's added or changed.
 *   - "viewport": elements as they scroll into view (and new ones as they appear).
 * Painted highlights (rangeHighlights.ts) also follow text edited in place, and drop the ones
 * of text that left the page.
 */

import type { PageHighlighter } from './pageHighlighter';
import type { RangeHighlights } from './rangeHighlights';
import type { LanguageGate } from './textLanguage';

/** after the page changes, wait this long before highlighting what changed */
const IDLE_DELAY = 200;
/** dropped / changed text: its painted highlights are checked this long after */
const PRUNE_DELAY = 1000;

export type HighlightSessionOptions = {
	highlighter: PageHighlighter<any>;
	/** painted highlights (null: spans) */
	ranges: RangeHighlights | null;
	/** the paragraphs' languages (forgotten when they change) */
	gate?: LanguageGate | null;
	mode: 'full' | 'viewport';
	/** something was highlighted (a count to update, items to prefetch…) */
	onChange?: () => void;
};

export class HighlightSession {
	private readonly options: HighlightSessionOptions;
	private mutationObserver: MutationObserver | null = null;
	private intersectionObserver: IntersectionObserver | null = null;
	private observed = new WeakSet<Element>();
	private pendingRoots: Node[] = [];
	private flushTimer: number | null = null;
	private pruneTimer: number | null = null;
	private stopped = false;

	constructor(options: HighlightSessionOptions) {
		this.options = options;
	}

	start(): void {
		if (!document.body) return;
		if (this.options.mode === 'full') this.startFull();
		else this.startViewport();
	}

	stop(): void {
		this.stopped = true;
		this.mutationObserver?.disconnect();
		this.mutationObserver = null;
		this.intersectionObserver?.disconnect();
		this.intersectionObserver = null;
		if (this.flushTimer !== null) clearTimeout(this.flushTimer);
		if (this.pruneTimer !== null) clearTimeout(this.pruneTimer);
		this.flushTimer = null;
		this.pruneTimer = null;
		this.pendingRoots = [];
	}

	private get highlighter() {
		return this.options.highlighter;
	}

	private changed(): void {
		if (!this.stopped) this.options.onChange?.();
	}

	/** Spans change the page's text themselves, so only painted highlights follow text edits. */
	private observerOptions(): MutationObserverInit {
		return this.options.ranges
			? { childList: true, subtree: true, characterData: true }
			: { childList: true, subtree: true };
	}

	/** Painted highlights of text that left the page (or changed) are dropped, on idle. */
	private schedulePrune(): void {
		if (!this.options.ranges || this.pruneTimer !== null) return;
		this.pruneTimer = window.setTimeout(() => {
			this.pruneTimer = null;
			if (this.stopped || !this.options.ranges) return;
			for (const node of this.options.ranges.prune()) this.highlighter.highlightRoot(node);
		}, PRUNE_DELAY);
	}

	/* ---------------------------------------------------------------- */
	/* The whole page                                                   */
	/* ---------------------------------------------------------------- */

	private startFull(): void {
		this.highlighter.highlightRoot(document.body);
		this.changed();
		this.mutationObserver = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				this.options.gate?.forget(mutation.target);
				mutation.addedNodes.forEach(node => this.pendingRoots.push(node));
				// painted: text edited in place (sites update their own text) is highlighted again
				if (mutation.type === 'characterData') this.pendingRoots.push(mutation.target);
				if (mutation.removedNodes.length) this.schedulePrune();
			}
			this.scheduleFlush();
		});
		this.mutationObserver.observe(document.body, this.observerOptions());
	}

	private scheduleFlush(): void {
		if (this.flushTimer !== null) return;
		this.flushTimer = window.setTimeout(() => {
			this.flushTimer = null;
			const roots = this.pendingRoots;
			this.pendingRoots = [];
			if (this.stopped) return;
			for (const node of roots) {
				if (!node.isConnected) continue;
				if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
					this.highlighter.highlightRoot(node);
				}
			}
			this.changed();
		}, IDLE_DELAY);
	}

	/* ---------------------------------------------------------------- */
	/* As it scrolls into view                                          */
	/* ---------------------------------------------------------------- */

	private startViewport(): void {
		this.intersectionObserver = new IntersectionObserver(entries => this.onIntersect(entries), {
			rootMargin: '150px 0px',
			threshold: 0,
		});
		this.observeCandidates(document.body);
		this.changed();

		this.mutationObserver = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				this.options.gate?.forget(mutation.target);
				// painted: text edited in place (sites update their own text) is highlighted again
				if (mutation.type === 'characterData') {
					const node = mutation.target;
					if (node.parentElement && !this.highlighter.isSkippable(node.parentElement)) {
						this.highlighter.highlightRoot(node);
						this.changed();
					}
					continue;
				}
				if (mutation.removedNodes.length) this.schedulePrune();
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === Node.ELEMENT_NODE) {
						this.observeCandidates(node as Element);
					} else if (node.nodeType === Node.TEXT_NODE && node.parentElement && !this.highlighter.isSkippable(node.parentElement)) {
						// text appended to an element already done: highlighted directly
						this.highlighter.highlightRoot(node);
						this.changed();
					}
				});
			}
		});
		this.mutationObserver.observe(document.body, this.observerOptions());
	}

	private onIntersect(entries: IntersectionObserverEntry[]): void {
		if (this.stopped) return;
		let changed = false;
		for (const entry of entries) {
			if (!entry.isIntersecting) continue;
			this.intersectionObserver?.unobserve(entry.target);
			this.highlighter.highlightRoot(entry.target);
			changed = true;
		}
		if (changed) this.changed();
	}

	/** The elements in a subtree holding text to highlight: watched until they're in view. */
	private observeCandidates(root: Element): void {
		if (!this.intersectionObserver || this.highlighter.isSkippable(root)) return;
		if (this.isCandidate(root)) this.observeElement(root);
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
			acceptNode: element => {
				if (this.highlighter.isSkippable(element as Element)) return NodeFilter.FILTER_REJECT;
				return this.isCandidate(element as Element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
			},
		});
		for (let current = walker.nextNode(); current; current = walker.nextNode()) this.observeElement(current as Element);
	}

	private observeElement(element: Element): void {
		if (!this.intersectionObserver || this.observed.has(element)) return;
		this.observed.add(element);
		this.intersectionObserver.observe(element);
	}

	/** An element directly holding text with something to highlight. */
	private isCandidate(element: Element): boolean {
		for (const node of Array.from(element.childNodes)) {
			if (node.nodeType === Node.TEXT_NODE && node.nodeValue && this.highlighter.hasMatch(node.nodeValue)) return true;
		}
		return false;
	}
}

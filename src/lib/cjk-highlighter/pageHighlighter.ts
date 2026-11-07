/**
 * The page side of highlighting: which text to look at (not scripts, inputs, furigana…), text
 * split over nodes (words over furigana / pinyin), what a paragraph's language lets through, and
 * handing the matches to the renderer. What to highlight is the matcher's (types.ts).
 *
 * Works on any subtree, so it can be driven as a full-page pass or incrementally (session.ts).
 */

import type { LanguageGate } from './textLanguage';
import type { Match, Matcher, Renderer } from './types';

/** Tags whose text content must never be touched. */
export const UNWANTED_TAGS = new Set([
	'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
	'CODE', 'PRE', 'KBD', 'SAMP', 'TITLE', 'HEAD', 'SVG', 'IMG', 'CANVAS',
	'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'MATH',
	// furigana: a reading over the text, not text to read
	'RT', 'RP',
]);

/** Elements that end a run of text (words aren't joined across them: furigana runs stay inside). */
export const BLOCK_SELECTOR = 'p, div, li, dd, dt, td, th, h1, h2, h3, h4, h5, h6, blockquote, figcaption, caption, section, article, header, footer, main, aside, nav, body';

export type PageHighlighterOptions<T> = {
	/** what each paragraph's language lets through (textLanguage.ts); none: everything */
	gate?: LanguageGate | null;
	/** elements whose text is the extension's own (its popups…): left alone */
	skip?: (element: Element) => boolean;
	/** every match kept (the extension's list of what the page has) */
	onMatch?: (match: Match<T>) => void;
};

export class PageHighlighter<T = unknown> {
	private readonly matcher: Matcher<T>;
	private readonly renderer: Renderer<T>;
	private readonly options: PageHighlighterOptions<T>;

	constructor(matcher: Matcher<T>, renderer: Renderer<T>, options: PageHighlighterOptions<T> = {}) {
		this.matcher = matcher;
		this.renderer = renderer;
		this.options = options;
	}

	isActive(): boolean {
		return this.matcher.isActive();
	}

	hasMatch(text: string): boolean {
		return this.matcher.hasMatch(text);
	}

	/** An element whose text isn't the page's to look at (unwanted, editable, a highlight, the extension's). */
	isSkippable(element: Element): boolean {
		if (UNWANTED_TAGS.has(element.tagName.toUpperCase())) return true;
		if ((element as HTMLElement).isContentEditable) return true;
		if (this.renderer.owns?.(element)) return true;
		return this.options.skip?.(element) ?? false;
	}

	highlightRoot(root: Node): void {
		if (!this.isActive()) return;

		if (root.nodeType === Node.TEXT_NODE) {
			const parent = root.parentElement;
			if (parent && this.isSkippable(parent)) return;
			this.renderNode(root as Text);
			return;
		}

		const element = root.nodeType === Node.ELEMENT_NODE ? (root as Element) : root.parentElement;
		if (element && this.isSkippable(element)) return;

		// words over furigana: the text around <ruby> read as one (painted highlights only, which
		// can span nodes); a ruby on its own (observed by itself): its whole block instead
		if (this.renderer.renderRun && this.matcher.matchesRuns) {
			const ruby = element?.closest('ruby');
			const block = ruby ? ruby.parentElement?.closest(BLOCK_SELECTOR) ?? ruby : root;
			for (const run of this.textRuns(block)) this.highlightRun(run);
			return;
		}

		const walker = document.createTreeWalker(
			root,
			NodeFilter.SHOW_TEXT,
			{ acceptNode: node => this.acceptTextNode(node as Text) },
		);
		const targets: Text[] = [];
		for (let current = walker.nextNode(); current; current = walker.nextNode()) targets.push(current as Text);
		for (const node of targets) this.renderNode(node);
	}

	/**
	 * The text nodes under `root`, in runs: a node joins the one before it when either is in a
	 * <ruby> (its base; the furigana is skipped) and they're in the same block, with nothing
	 * else between them. 奈良県<ruby>話<rt>はな</rt></ruby>していました: 話 + していました.
	 */
	private textRuns(root: Node): Text[][] {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
			acceptNode: node => {
				const parent = node.parentElement;
				if (!parent || this.isSkippable(parent) || !node.nodeValue) return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			},
		});
		const runs: Text[][] = [];
		let run: Text[] = [];
		let previous: Text | null = null;
		for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
			const joins = previous
				&& (previous.parentElement?.closest('ruby') || node.parentElement?.closest('ruby'))
				&& previous.parentElement?.closest(BLOCK_SELECTOR) === node.parentElement?.closest(BLOCK_SELECTOR);
			if (!joins && run.length) {
				runs.push(run);
				run = [];
			}
			run.push(node);
			previous = node;
		}
		if (run.length) runs.push(run);
		return runs;
	}

	/** A run of text nodes: matched as one text (a single node: as before). */
	private highlightRun(nodes: Text[]): void {
		if (nodes.length === 1) {
			if (this.hasMatch(nodes[0].nodeValue ?? '')) this.renderNode(nodes[0]);
			return;
		}
		const text = nodes.map(node => node.nodeValue ?? '').join('');
		const matches = this.hasMatch(text) ? this.allowed(nodes, text, this.matcher.findMatches(text)) : [];
		for (const match of matches) this.options.onMatch?.(match);
		this.renderer.renderRun!(nodes, matches);
	}

	private acceptTextNode(node: Text): number {
		const parent = node.parentElement;
		if (!parent || this.isSkippable(parent)) return NodeFilter.FILTER_REJECT;
		const text = node.nodeValue;
		if (!text || !this.hasMatch(text)) return NodeFilter.FILTER_REJECT;
		return NodeFilter.FILTER_ACCEPT;
	}

	private renderNode(node: Text): void {
		const text = node.nodeValue;
		if (!text) return;
		const matches = this.allowed([node], text, this.matcher.findMatches(text));
		for (const match of matches) this.options.onMatch?.(match);
		this.renderer.render(node, matches);
	}

	/** The matches the paragraph's language lets through (Chinese text, say, may be left alone). */
	private allowed(nodes: Text[], text: string, matches: Match<T>[]): Match<T>[] {
		return this.options.gate ? this.options.gate.filter(nodes, text, matches) : matches;
	}
}

/**
 * The fallback renderer (no painted highlights, and extension pages): each match wrapped in an
 * element the extension makes (it carries `markClass`). The page's text is split up.
 */
export class SpanRenderer<T = unknown> implements Renderer<T> {
	private readonly makeSpan: (match: Match<T>, surface: string) => HTMLElement;
	readonly markClass: string;

	constructor(makeSpan: (match: Match<T>, surface: string) => HTMLElement, markClass: string) {
		this.makeSpan = makeSpan;
		this.markClass = markClass;
	}

	owns(element: Element): boolean {
		return element.classList.contains(this.markClass);
	}

	render(node: Text, matches: Match<T>[]): void {
		if (!matches.length) return;
		const text = node.nodeValue ?? '';
		const fragment = document.createDocumentFragment();
		let lastIndex = 0;
		for (const match of matches) {
			if (match.start > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.start)));
			fragment.appendChild(this.makeSpan(match, text.slice(match.start, match.end)));
			lastIndex = match.end;
		}
		if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
		node.parentNode?.replaceChild(fragment, node);
	}
}

/** Undo SpanRenderer's spans (their text back as plain text). */
export function clearSpans(markClass: string, root: ParentNode = document): void {
	root.querySelectorAll(`span.${markClass}`).forEach(span => {
		const parent = span.parentNode;
		if (!parent) return;
		parent.replaceChild(document.createTextNode(span.textContent ?? ''), span);
		parent.normalize();
	});
}

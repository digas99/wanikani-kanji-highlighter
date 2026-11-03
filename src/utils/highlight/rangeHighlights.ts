/**
 * Highlights painted with the CSS Custom Highlight API: the page's text is never split
 * into spans, so sites that update their own text (YouTube's title, …) and the browser's
 * translation, which needs whole sentences, keep working.
 *
 * Each match becomes a Range in a named Highlight (`::highlight(wkh-…)` in the page's
 * styles, see runtime.ts). Ranges aren't elements, so hovering / clicking is found by
 * hit-testing: the text under the pointer, then the match whose boxes contain it.
 */

import { highlightNameFor, type HighlightMatch, type HighlightRenderer } from './highlighter';

/** What's highlighted at a point: the popup opens on it. */
export type RangeHit = {
	value: string;
	type: 'kanji' | 'vocabulary';
	/** the same object while the pointer stays on the same highlighted text */
	key: object;
};

/** A highlighted kanji / word: one range, or (a word over furigana) one per text node it's in. */
type Entry = RangeHit & { ranges: Range[]; name: string };

/** Painted hover feedback (a span used to fade); above the colors. */
export const HOVER_HIGHLIGHT = 'wkh-hover';

export function supportsRangeHighlights(): boolean {
	return typeof CSS !== 'undefined'
		&& 'highlights' in CSS
		&& typeof (globalThis as any).Highlight === 'function'
		&& (typeof (document as any).caretPositionFromPoint === 'function'
			|| typeof (document as any).caretRangeFromPoint === 'function');
}

export class RangeHighlights implements HighlightRenderer {
	private readonly highlights = new Map<string, Highlight>();
	/** what's painted in each text node, and the text it was painted for (`run`: with the nodes around it) */
	private readonly nodes = new Map<Text, { data: string; entries: Entry[]; run?: string }>();
	private hover: Highlight | null = null;
	private hovered: Entry | null = null;

	render(node: Text, matches: HighlightMatch[]): void {
		const current = this.nodes.get(node);
		// already painted for this text (an element observed twice, a re-added subtree…)
		if (current && current.data === node.data && current.entries.length === matches.length) return;
		this.forget(node);
		if (!matches.length) return;

		const entries: Entry[] = matches.map(match => {
			const range = new Range();
			range.setStart(node, match.start);
			range.setEnd(node, match.end);
			const name = highlightNameFor(match.meta);
			this.highlight(name).add(range);
			const entry = { value: match.value, type: match.type, ranges: [range], name } as Entry;
			entry.key = entry;
			return entry;
		});
		this.nodes.set(node, { data: node.data, entries });
	}

	/**
	 * Matches in text split over several nodes (furigana: 話 | していました), by position in their
	 * joined text. A match spanning nodes is painted node by node (one range across them would
	 * also paint the furigana between); each node keeps the matches it's part of (hover, prune).
	 */
	renderRun(nodes: Text[], matches: HighlightMatch[]): void {
		// already painted for this text (a block reached again through another of its rubies)
		const run = nodes.map(node => node.data).join('');
		if (nodes.every(node => this.nodes.get(node)?.run === run)) return;
		for (const node of nodes) this.forget(node);
		const starts: number[] = [];
		let offset = 0;
		for (const node of nodes) {
			starts.push(offset);
			offset += node.data.length;
		}
		/** the node a position is in (`end`: a match's end may be a node's last position) */
		const locate = (position: number, end: boolean) => {
			for (let index = 0; index < nodes.length; index++) {
				const last = starts[index] + nodes[index].data.length;
				if (end ? position <= last && position > starts[index] : position < last) {
					return { index, node: nodes[index], offset: position - starts[index] };
				}
			}
			return null;
		};
		const byNode = new Map<Text, Entry[]>(nodes.map(node => [node, []]));
		for (const match of matches) {
			const start = locate(match.start, false);
			const end = locate(match.end, true);
			if (!start || !end) continue;
			const name = highlightNameFor(match.meta);
			const ranges: Range[] = [];
			for (let index = start.index; index <= end.index; index++) {
				const node = nodes[index];
				const range = new Range();
				range.setStart(node, index === start.index ? start.offset : 0);
				range.setEnd(node, index === end.index ? end.offset : node.data.length);
				if (range.collapsed) continue;
				this.highlight(name).add(range);
				ranges.push(range);
			}
			const entry = { value: match.value, type: match.type, ranges, name } as Entry;
			entry.key = entry;
			for (let index = start.index; index <= end.index; index++) byNode.get(nodes[index])!.push(entry);
		}
		// every node of the run (those without a highlight too: the run is known painted)
		for (const [node, entries] of byNode) this.nodes.set(node, { data: node.data, entries, run });
	}

	private highlight(name: string): Highlight {
		let highlight = this.highlights.get(name);
		if (!highlight) {
			highlight = new Highlight();
			this.highlights.set(name, highlight);
			CSS.highlights.set(name, highlight);
		}
		return highlight;
	}

	private forget(node: Text): void {
		const current = this.nodes.get(node);
		if (!current) return;
		for (const entry of current.entries) {
			for (const range of entry.ranges) this.highlights.get(entry.name)?.delete(range);
			if (this.hovered === entry) this.setHovered(null);
		}
		this.nodes.delete(node);
	}

	/**
	 * Text that left the page, or changed under its highlights (live ranges then cover the
	 * wrong characters): drop them. Changed text that's still there gets highlighted again.
	 */
	prune(): Text[] {
		const changed: Text[] = [];
		for (const [node, current] of this.nodes) {
			if (!node.isConnected) {
				this.forget(node);
			} else if (node.data !== current.data) {
				this.forget(node);
				changed.push(node);
			}
		}
		return changed;
	}

	/** The highlighted kanji / word at a point of the window, if any. */
	hitTest(x: number, y: number): RangeHit | null {
		const position = caretAt(x, y);
		if (!position || position.node.nodeType !== Node.TEXT_NODE) return null;
		const current = this.nodes.get(position.node as Text);
		if (!current) return null;
		for (const entry of current.entries) {
			for (const range of entry.ranges) {
				for (const rect of range.getClientRects()) {
					if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return entry;
				}
			}
		}
		return null;
	}

	/** Hover feedback for the highlighted text under the pointer (null: none). */
	setHovered(hit: RangeHit | null): void {
		const entry = (hit as Entry | null) ?? null;
		if (entry === this.hovered) return;
		if (!this.hover) {
			this.hover = new Highlight();
			// painted over the colors
			this.hover.priority = 1;
			CSS.highlights.set(HOVER_HIGHLIGHT, this.hover);
		}
		this.hover.clear();
		// a word over furigana: all its parts
		if (entry) for (const range of entry.ranges) this.hover.add(range);
		this.hovered = entry;
	}

	clear(): void {
		for (const name of this.highlights.keys()) CSS.highlights.delete(name);
		CSS.highlights.delete(HOVER_HIGHLIGHT);
		this.highlights.clear();
		this.nodes.clear();
		this.hover = null;
		this.hovered = null;
	}
}

/** The text position under a point (both APIs: Firefox has the first, older Chrome the second). */
function caretAt(x: number, y: number): { node: Node; offset: number } | null {
	const doc = document as any;
	if (typeof doc.caretPositionFromPoint === 'function') {
		const position = doc.caretPositionFromPoint(x, y);
		return position?.offsetNode ? { node: position.offsetNode, offset: position.offset } : null;
	}
	const range = doc.caretRangeFromPoint?.(x, y) as Range | null;
	return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

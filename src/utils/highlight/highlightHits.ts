/**
 * "Which highlighted kanji / word is under the pointer?", for both ways of highlighting:
 * a span (the fallback, and extension pages) or painted text (rangeHighlights.ts), which
 * only the runtime can hit-test.
 */

import { HIGHLIGHT_MARK_CLASS, highlightValueOf } from './highlighter';
import type { RangeHit } from 'cjk-highlighter';

export type HighlightHit = {
	value: string;
	type?: string;
	/** the same object while the pointer stays on the same highlighted text */
	key: object;
};

let rangeHitTest: ((x: number, y: number) => RangeHit | null) | null = null;

/** The runtime sets this while painted highlights are on the page. */
export function setRangeHitTest(test: ((x: number, y: number) => RangeHit | null) | null): void {
	rangeHitTest = test;
}

export function isPaintingHighlights(): boolean {
	return rangeHitTest !== null;
}

// several listeners look at the same mouse event: hit-test it once
const hitsByEvent = new WeakMap<Event, HighlightHit | null>();

export function highlightAt(event: MouseEvent): HighlightHit | null {
	if (hitsByEvent.has(event)) return hitsByEvent.get(event) ?? null;
	let hit: HighlightHit | null = null;
	const span = (event.target as Element | null)?.closest?.(`.${HIGHLIGHT_MARK_CLASS}`) as HTMLElement | null;
	if (span) {
		// a conjugated word: the word it is (話して → 話す)
		const value = highlightValueOf(span);
		if (value) hit = { value, type: span.getAttribute('data-wkh-type') ?? undefined, key: span };
	} else if (rangeHitTest) {
		hit = rangeHitTest(event.clientX, event.clientY);
	}
	hitsByEvent.set(event, hit);
	return hit;
}

/**
 * Runs in WaniKani's reviews page itself (injected by utils/highlight/reviewInfo.ts): its quiz
 * announces each question and answer with events whose details the content script (in its own,
 * isolated world) can't always read. Passes on only what the review panel needs: which subject,
 * which question, and whether the answer was right. Never the answer, the meaning or reading.
 *
 * WaniKani's events aren't a documented API (community.wanikani.com/t/60912): everything is
 * read defensively, and the panel has a fallback that reads the page instead.
 */
export default defineUnlistedScript(() => {
	const w = window as any;
	if (w.__wkhReviewBridge) return;
	w.__wkhReviewBridge = true;

	const post = (data: Record<string, unknown>) => window.postMessage({ source: 'wkh-review-bridge', ...data }, location.origin);
	const subjectOf = (detail: any) => detail?.subject ?? detail?.subjectWithStats?.subject ?? null;
	const idOf = (detail: any) => {
		const id = Number(subjectOf(detail)?.id ?? detail?.subjectId);
		return Number.isFinite(id) ? id : null;
	};
	const text = (value: unknown) => (typeof value === 'string' ? value : null);
	/**
	 * WaniKani's own count of the subject's wrong answers this session (what its SRS change is
	 * worked out from): more reliable than adding up 'fail' events, which an undo (or an event
	 * seen twice) would throw off. null when the payload doesn't have it.
	 */
	const incorrectOf = (detail: any): number | null => {
		const stats = detail?.subjectWithStats?.stats ?? detail?.stats;
		if (!stats) return null;
		const count = (part: any) => Number(part?.incorrect ?? part?.incorrectCount ?? NaN);
		const parts = [count(stats.meaning), count(stats.reading)].filter(Number.isFinite);
		return parts.length ? parts.reduce((sum, value) => sum + value, 0) : null;
	};
	/** the same, per part ({ meaning, reading }); null when the payload doesn't have it */
	const incorrectPartsOf = (detail: any): Record<string, number> | null => {
		const stats = detail?.subjectWithStats?.stats ?? detail?.stats;
		if (!stats) return null;
		const parts: Record<string, number> = {};
		for (const part of ['meaning', 'reading']) {
			const count = Number(stats[part]?.incorrect ?? stats[part]?.incorrectCount ?? NaN);
			if (Number.isFinite(count)) parts[part] = count;
		}
		return Object.keys(parts).length ? parts : null;
	};

	// dispatched on window (some versions on document): each event handled once
	const seen = new WeakSet<Event>();
	const on = (name: string, handler: (detail: any) => void) => {
		const listener = (event: Event) => {
			if (seen.has(event)) return;
			seen.add(event);
			try {
				handler((event as CustomEvent).detail);
			} catch {
				// a changed payload: the panel falls back to reading the page
			}
		};
		window.addEventListener(name, listener);
		document.addEventListener(name, listener);
	};

	on('willShowNextQuestion', detail => post({
		type: 'question',
		subjectId: idOf(detail),
		questionType: text(detail?.questionType),
		subjectType: text(subjectOf(detail)?.type),
		characters: text(subjectOf(detail)?.characters),
	}));

	on('didAnswerQuestion', detail => post({
		type: 'answer',
		subjectId: idOf(detail),
		questionType: text(detail?.questionType),
		// 'pass' / 'fail' (others, e.g. a warning shake, aren't answers)
		action: text(detail?.results?.action),
		incorrect: incorrectOf(detail),
		incorrectParts: incorrectPartsOf(detail),
	}));

	// an answer taken back (WaniKani's undo, or a script's): its 'fail' doesn't count anymore
	on('didUnanswerQuestion', detail => post({
		type: 'unanswer',
		subjectId: idOf(detail),
		questionType: text(detail?.questionType),
		incorrect: incorrectOf(detail),
	}));

	on('didCompleteSubject', detail => post({ type: 'complete', subjectId: idOf(detail), incorrect: incorrectOf(detail), incorrectParts: incorrectPartsOf(detail) }));
});

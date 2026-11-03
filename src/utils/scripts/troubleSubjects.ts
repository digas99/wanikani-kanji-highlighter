import { reactive } from 'vue';
import { storage } from '#imports';

/** initialDataSync.ts's lock (read here directly: that module brings the API client along,
 *  and this one is in the pages' details popup too) */
const INITIAL_SYNC_LOCK_KEY = 'local:initialSyncLock';
const INITIAL_SYNC_LOCK_MAX_AGE_MS = 2 * 60 * 60 * 1000;

async function isInitialSyncLocked(): Promise<boolean> {
	const since = await storage.getItem<number>(INITIAL_SYNC_LOCK_KEY);
	return Boolean(since && Date.now() - since < INITIAL_SYNC_LOCK_MAX_AGE_MS);
}

/**
 * "Trouble" subjects: the ones you keep getting wrong (what the WaniKani community calls
 * leeches). From WaniKani's review statistics, for meaning and reading apart:
 *
 *   score = wrong answers / (current streak of right answers) ^ 1.5
 *
 * It grows with every mistake and shrinks fast as you get it right in a row, so a subject
 * leaves the list on its own once it sticks. Trouble from a score of 2 (the community's
 * usual 1 flagged too many: wrong answers add up over the years), with at least 3 wrong
 * answers and under 80% right overall.
 *
 * Only subjects in Apprentice now: from Guru up you've been getting it right lately, whatever
 * the old mistakes. A passed subject that fell back to Apprentice counts again (the classic case).
 */

/** from this score: trouble */
export const TROUBLE_SCORE = 2;
/** from this one: the worst (listed first, a red mark) */
export const SERIOUS_TROUBLE_SCORE = 5;
/** fewer wrong answers than this: not trouble, whatever the streak */
const MIN_INCORRECT = 3;
/** right this often or more: not trouble (a few misses on a well-known subject) */
const MAX_PERCENT = 80;
/** Guru I: from here up, not trouble */
const GURU_STAGE = 5;

export type TroublePart = {
	correct: number;
	incorrect: number;
	/** right answers in a row now */
	streak: number;
	/** 0–100 */
	percent: number;
	score: number;
};

export type TroubleInfo = {
	id: number;
	subjectType: string;
	/** the worse of meaning and reading */
	score: number;
	serious: boolean;
	/** which part is trouble (both: both are) */
	part: 'meaning' | 'reading' | 'both';
	meaning: TroublePart | null;
	reading: TroublePart | null;
};

function partOf(correct: unknown, incorrect: unknown, streak: unknown): TroublePart | null {
	const right = Number(correct) || 0;
	const wrong = Number(incorrect) || 0;
	if (right + wrong === 0) return null;
	// WaniKani starts streaks at 1; never divide by less
	const inARow = Math.max(Number(streak) || 0, 1);
	return {
		correct: right,
		incorrect: wrong,
		streak: inARow,
		percent: Math.round((right / (right + wrong)) * 100),
		score: wrong / inARow ** 1.5,
	};
}

const isTrouble = (part: TroublePart | null) => Boolean(
	part && part.incorrect >= MIN_INCORRECT && part.percent < MAX_PERCENT && part.score >= TROUBLE_SCORE,
);

/**
 * A subject's trouble, from its review statistics (WaniKani's review_statistics fields, as
 * cached), or null when it isn't trouble. `srsStage`: only Apprentice (1–4) can be.
 */
export function troubleOf(reviews: any, srsStage?: number | null): TroubleInfo | null {
	if (!reviews || reviews.hidden) return null;
	// unknown stage (assignments not loaded yet): not marked until it is
	if (srsStage == null || srsStage < 1 || srsStage >= GURU_STAGE) return null;
	const meaning = partOf(reviews.meaning_correct, reviews.meaning_incorrect, reviews.meaning_current_streak);
	const reading = partOf(reviews.reading_correct, reviews.reading_incorrect, reviews.reading_current_streak);
	const meaningTrouble = isTrouble(meaning);
	const readingTrouble = isTrouble(reading);
	if (!meaningTrouble && !readingTrouble) return null;
	const score = Math.max(meaningTrouble ? meaning!.score : 0, readingTrouble ? reading!.score : 0);
	return {
		id: Number(reviews.subject_id ?? reviews.id),
		subjectType: String(reviews.subject_type ?? ''),
		score,
		serious: score >= SERIOUS_TROUBLE_SCORE,
		part: meaningTrouble && readingTrouble ? 'both' : meaningTrouble ? 'meaning' : 'reading',
		meaning,
		reading,
	};
}

/** "Trouble subject: meaning 54% right (6 wrong, 1 right in a row now)" */
export function troubleText(info: TroubleInfo): string {
	const describe = (label: string, part: TroublePart | null) => (part
		? `${label} ${part.percent}% right (${part.incorrect} wrong, ${part.streak} right in a row now)`
		: '');
	const parts = info.part === 'both'
		? [describe('meaning', info.meaning), describe('reading', info.reading)]
		: [describe(info.part, info[info.part])];
	return `Trouble subject: ${parts.filter(Boolean).join('; ')}`;
}

/* ------------------------------------------------------------------ */
/* Every subject's trouble, shared (tiles, the list, Home's pill)      */
/* ------------------------------------------------------------------ */

const shared = reactive({
	byId: new Map<number, TroubleInfo>(),
	loaded: false,
});

type Assignment = { subject_id: number; srs_stage?: number | null };

let loading: Promise<void> | null = null;
/** asked again while working it out: once more after, with the newest data */
let again: { manager: any; assignments: Assignment[] } | null = null;
/** this session fetched every review statistic already (a new device's cache had few) */
let fetchedAll = false;
/** the cache holds statistics for at least this share of the started subjects: complete enough */
const COMPLETE_SHARE = 0.9;

/**
 * A new device's cache only has the statistics of what was opened or loaded so far (a subject's
 * details, a level in the Profile): fetches all of them once, when far fewer than the started
 * subjects. Not during the first big sync (it needs the request budget).
 */
async function completeReviews(manager: any, reviews: any[], assignments: Assignment[]): Promise<any[]> {
	if (fetchedAll || !manager?.fetchReviewStatisticsSince) return reviews;
	const started = assignments.filter(assignment => (assignment.srs_stage ?? 0) >= 1).length;
	if (!started || reviews.length >= started * COMPLETE_SHARE) return reviews;
	if (await isInitialSyncLocked()) return reviews;
	fetchedAll = true;
	const fetched = await manager.fetchReviewStatisticsSince(null).catch(() => null);
	if (!Array.isArray(fetched)) {
		// try again next time
		fetchedAll = false;
		return reviews;
	}
	return await manager.storage.getReviews() ?? reviews;
}

/**
 * Works out every subject's trouble from the cached review statistics (kept up to date by the
 * daily activity sync, completed once if a new device's cache has few) and the assignments
 * (only Apprentice counts). Again whenever called.
 */
export function loadTroubleSubjects(manager: any, assignments: Assignment[]): Promise<void> {
	if (loading) {
		again = { manager, assignments };
		return loading;
	}
	loading = (async () => {
		try {
			const cached: any[] = await manager?.storage?.getReviews?.() ?? [];
			const reviews = await completeReviews(manager, cached, assignments);
			const stageById = new Map(assignments.map(assignment => [assignment.subject_id, assignment.srs_stage ?? null]));
			const byId = new Map<number, TroubleInfo>();
			for (const review of reviews) {
				const info = troubleOf(review, stageById.get(Number(review.subject_id)));
				if (info) byId.set(info.id, info);
			}
			shared.byId = byId;
			shared.loaded = true;
		} catch {
			// the cache isn't ready (first sync): nothing is trouble yet
		}
	})().finally(() => {
		loading = null;
		if (again) {
			const next = again;
			again = null;
			void loadTroubleSubjects(next.manager, next.assignments);
		}
	});
	return loading;
}

/**
 * Calls back (once things settle) whenever review statistics are saved, from anywhere: a
 * subject's details, a level loaded, the activity sync. Returns the unsubscribe.
 */
export function watchReviewStatistics(manager: any, callback: () => void, delay = 800): () => void {
	const events = manager?.events;
	if (!events?.on) return () => {};
	let timer: ReturnType<typeof setTimeout> | null = null;
	const onUpdate = () => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => { timer = null; callback(); }, delay);
	};
	events.on('update:reviews', onUpdate);
	return () => {
		if (timer) clearTimeout(timer);
		events.off?.('update:reviews', onUpdate);
	};
}

export function useTroubleSubjects() {
	return shared;
}

/** Worst first. */
export function sortedTrouble(byId: Map<number, TroubleInfo>): TroubleInfo[] {
	return [...byId.values()].sort((a, b) => b.score - a.score);
}

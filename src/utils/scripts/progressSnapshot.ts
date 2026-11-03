/**
 * "Since your last visit": SRS stage counts are saved each time the popup is opened
 * (once the data is fresh), and compared with the counts saved on the previous visit.
 */
import { groupAssignmentsBySRSStage } from '@/utils/scripts/common';

const STORAGE_KEY = 'progressSnapshot';

type Snapshot = { at: number; counts: Record<string, number> };

export type SinceLastVisit = {
	/** previous visit time */
	since: number;
	/** change per SRS stage id (0–9), only non-zero entries */
	deltas: Record<string, number>;
};

/** Computed once per popup session (the module lives as long as the popup page). */
let sessionResult: SinceLastVisit | null | undefined;

function countByStage(assignments: Array<any>): Record<string, number> {
	return Object.fromEntries(
		groupAssignmentsBySRSStage(assignments).map(stage => [String(stage.id), stage.items.length]),
	);
}

function readSnapshot(): Snapshot | null {
	try {
		const snapshot = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
		return snapshot?.counts && typeof snapshot.at === 'number' ? snapshot : null;
	} catch {
		return null;
	}
}

function writeSnapshot(snapshot: Snapshot): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
	} catch {
		// optional feature
	}
}

/** The result for this session, if already computed. */
export function getSinceLastVisit(): SinceLastVisit | null | undefined {
	return sessionResult;
}

/**
 * Compare fresh assignments with the previous visit, then save them as the new baseline.
 * Only the first call per popup session does anything.
 */
export function computeSinceLastVisit(assignments: Array<any>): SinceLastVisit | null {
	if (sessionResult !== undefined) return sessionResult;

	const visible = assignments.filter(assignment => !assignment.hidden);
	const counts = countByStage(visible);
	const previous = readSnapshot();
	writeSnapshot({ at: Date.now(), counts });

	if (!previous) {
		sessionResult = null; // first visit: nothing to compare yet
		return sessionResult;
	}

	const deltas: Record<string, number> = {};
	for (const [stage, count] of Object.entries(counts)) {
		const delta = count - (previous.counts[stage] ?? 0);
		if (delta) deltas[stage] = delta;
	}
	sessionResult = { since: previous.at, deltas };
	return sessionResult;
}

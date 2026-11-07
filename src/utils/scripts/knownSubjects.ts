import { reactive } from 'vue';
import { storage } from '#imports';

/**
 * "Known": a subject you already know before WaniKani unlocks it (an N5 word you learned
 * elsewhere, say). Practice skips it (Practice.vue), and it has its own color. Only locked
 * subjects can be known: once a subject unlocks (Initiate or further), its mark is gone for good.
 *
 * Kept as subject ids in the extension's storage (the pages' details popup marks them too).
 */

export const KNOWN_SUBJECTS_KEY = 'local:knownSubjects';
/** its color (Settings → Theme: `appearance.known_color`) */
export const KNOWN_COLOR = '#14a39a';
export const KNOWN_LABEL = 'Known';

const state = reactive({ ids: new Set<number>(), loaded: false, color: KNOWN_COLOR });
let started = false;

function setColor(settings: any) {
	state.color = settings?.appearance?.known_color || KNOWN_COLOR;
}

function setIds(ids: unknown) {
	state.ids = new Set(Array.isArray(ids) ? ids.filter(id => Number.isInteger(id)) : []);
	state.loaded = true;
}

/** The known subjects' ids and their color (reactive), kept up to date. */
export function useKnownSubjects(): { ids: Set<number>; loaded: boolean; color: string } {
	if (!started) {
		started = true;
		void storage.getItem<number[]>(KNOWN_SUBJECTS_KEY).then(setIds);
		storage.watch<number[]>(KNOWN_SUBJECTS_KEY, setIds);
		void storage.getItem<any>('local:settings').then(setColor);
		storage.watch<any>('local:settings', setColor);
	}
	return state;
}

/** Not unlocked yet: no SRS stage (an Initiate subject has stage 0). */
export function isLockedSubject(subject: any): boolean {
	const assignment = subject?.assignment;
	return assignment?.srs_stage == null && !assignment?.started_at && !assignment?.passed_at;
}

/** Marked known, and still locked (a mark left on a subject that unlocked doesn't count). */
export function isKnownSubject(subject: any, ids: Set<number> = state.ids): boolean {
	if (!subject || !ids.has(Number(subject.id))) return false;
	// the Profile's subjects say it themselves
	if (typeof subject.isLocked === 'boolean') return subject.isLocked;
	return isLockedSubject(subject);
}

/** How many of these subjects are known (reactive: in a computed, it follows the marks). */
export function countKnownSubjects(subjects: unknown, ids: Set<number> = state.ids): number {
	if (!Array.isArray(subjects) || !ids.size) return 0;
	let count = 0;
	for (const subject of subjects) if (isKnownSubject(subject, ids)) count += 1;
	return count;
}

/** The known color now (Settings → Theme), for code outside components. */
export function knownColor(): string {
	return state.color;
}

export async function setSubjectKnown(subject: any, known: boolean): Promise<void> {
	if (!subject?.id || (known && !isLockedSubject(subject))) return;
	const ids = new Set(await storage.getItem<number[]>(KNOWN_SUBJECTS_KEY) ?? []);
	if (known) ids.add(subject.id);
	else ids.delete(subject.id);
	setIds([...ids]);
	await storage.setItem(KNOWN_SUBJECTS_KEY, [...ids]);
}

/** The subjects unlocked since they were marked (they have an assignment now): unmarked for good. */
export async function pruneKnownSubjects(assignments: Array<{ subject_id?: number }> | null | undefined): Promise<void> {
	if (!assignments?.length) return;
	const ids = await storage.getItem<number[]>(KNOWN_SUBJECTS_KEY);
	if (!ids?.length) return;
	const unlocked = new Set(assignments.map(assignment => assignment.subject_id));
	const kept = ids.filter(id => !unlocked.has(id));
	if (kept.length !== ids.length) await storage.setItem(KNOWN_SUBJECTS_KEY, kept);
}

/** The known subjects' ids, read now (`useKnownSubjects` may not have them yet). */
export async function readKnownSubjectIds(): Promise<Set<number>> {
	const ids = await storage.getItem<number[]>(KNOWN_SUBJECTS_KEY);
	return new Set(Array.isArray(ids) ? ids : []);
}

/** Not started yet: locked, or waiting for its lesson (Initiate). */
export function isNotStartedSubject(subject: any): boolean {
	if (isLockedSubject(subject)) return true;
	const assignment = subject?.assignment;
	return !(assignment?.srs_stage > 0) && !assignment?.passed_at;
}

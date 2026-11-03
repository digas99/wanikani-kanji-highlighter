import { storage } from '#imports';
import { addNotifications } from './notifications';

/**
 * Your own milestones: leveling up (noticed by the popup and the background's hourly check)
 * and unlocking accolades (the popup, once your subjects are in). Each gets a notification
 * and a toast once; a level-up also gets a celebration on Home once.
 *
 * The first time (no level / accolades remembered yet), what's there is only remembered:
 * nothing is announced for progress made before this existed.
 */

const STORAGE_KEY = 'local:milestones';
/** a level-up not celebrated within this long (popup not opened) isn't celebrated late */
const CELEBRATE_WITHIN_MS = 7 * 24 * 60 * 60 * 1000;

export type LevelUp = { from: number; to: number; at: number; announced: boolean; celebrated: boolean };
export type AccoladeUnlock = { id: string; title: string; image: string; at: number; announced: boolean };

type MilestonesState = {
	version: 1;
	/** the last level seen (null: nothing yet) */
	level: number | null;
	levelUps: LevelUp[];
	/** accolades seen unlocked (null: nothing yet); only ever grows */
	accolades: string[] | null;
	/**
	 * Kinds of accolades already looked at: a kind new to this (added in an update) is only
	 * remembered at first, like everything on the very first run. Missing: the first five.
	 */
	accoladeTypes?: string[];
	accoladeUnlocks: AccoladeUnlock[];
};

function emptyState(): MilestonesState {
	return { version: 1, level: null, levelUps: [], accolades: null, accoladeUnlocks: [] };
}

export async function readMilestones(): Promise<MilestonesState> {
	const saved = await storage.getItem<MilestonesState>(STORAGE_KEY);
	return saved?.version === 1 ? saved : emptyState();
}

async function saveMilestones(state: MilestonesState): Promise<void> {
	// only the latest few are needed (toast, celebration)
	state.levelUps = state.levelUps.slice(-5);
	state.accoladeUnlocks = state.accoladeUnlocks.slice(-10);
	await storage.setItem(STORAGE_KEY, state);
}

/** One change at a time (a level-up and its accolade arrive together): none is lost. */
let queue: Promise<unknown> = Promise.resolve();
function queued<T>(task: () => Promise<T>): Promise<T> {
	const run = queue.then(task, task);
	queue = run.catch(() => {});
	return run;
}

export function watchMilestones(callback: (state: MilestonesState) => void): () => void {
	return storage.watch<MilestonesState>(STORAGE_KEY, state => callback(state?.version === 1 ? state : emptyState()));
}

export async function clearMilestones(): Promise<void> {
	await storage.removeItem(STORAGE_KEY);
}

/** Your current level; `at`: when it was reached (WaniKani's level progression), if known. */
export function noteLevel(level: number, at?: number): Promise<void> {
	if (!Number.isFinite(level) || level <= 0) return Promise.resolve();
	return queued(() => saveLevel(level, at));
}

async function saveLevel(level: number, at?: number): Promise<void> {
	const state = await readMilestones();
	const previous = state.level;
	if (previous === level) return;
	state.level = level;
	// first time, or a reset to a lower level: just remember it
	if (previous == null || level < previous) {
		await saveMilestones(state);
		return;
	}
	const levelUp: LevelUp = { from: previous, to: level, at: at ?? Date.now(), announced: false, celebrated: false };
	state.levelUps.push(levelUp);
	await saveMilestones(state);
	await addNotifications([{
		kind: 'level_up',
		title: `You reached level ${level}!`,
		text: level - previous > 1 ? `Up from level ${previous}.` : 'Keep it up!',
		at: levelUp.at,
		route: { name: 'Profile' },
	}]);
}

/** The accolades unlocked now (from computeAccolades, with complete data). */
export function noteAccolades(unlocked: AccoladeSeen[], types: string[]): Promise<void> {
	return queued(() => saveAccolades(unlocked, types));
}

type AccoladeSeen = { id: string; type: string; title: string; image: string };

const FIRST_ACCOLADE_TYPES = ['level', 'anniversary', 'burned', 'jlpt', 'joyo'];

async function saveAccolades(unlocked: AccoladeSeen[], types: string[]): Promise<void> {
	const state = await readMilestones();
	const known = new Set(state.accolades ?? []);
	const knownTypes = new Set(state.accolades == null ? [] : state.accoladeTypes ?? FIRST_ACCOLADE_TYPES);
	const fresh = unlocked.filter(accolade => !known.has(accolade.id));
	if (state.accolades && !fresh.length && types.every(type => knownTypes.has(type))) return;
	state.accolades = [...known, ...fresh.map(accolade => accolade.id)];
	state.accoladeTypes = [...new Set([...knownTypes, ...types])];
	// said only for kinds looked at before (the rest were unlocked before this knew of them)
	const announced = fresh.filter(accolade => knownTypes.has(accolade.type));
	const now = Date.now();
	state.accoladeUnlocks.push(...announced.map(({ id, title, image }) => ({ id, title, image, at: now, announced: false })));
	await saveMilestones(state);
	await addNotifications(announced.map(accolade => ({
		kind: 'accolade' as const,
		title: `Accolade unlocked: ${accolade.title}`,
		image: accolade.image,
		at: now,
		route: { name: 'Accolades' },
	})));
}

/** For the toast: what hasn't been said yet. */
export function unannouncedMilestones(state: MilestonesState): { levelUps: LevelUp[]; accolades: AccoladeUnlock[] } {
	return {
		levelUps: state.levelUps.filter(levelUp => !levelUp.announced),
		accolades: state.accoladeUnlocks.filter(unlock => !unlock.announced),
	};
}

export function markMilestonesAnnounced(): Promise<void> {
	return queued(async () => {
		const state = await readMilestones();
		state.levelUps = state.levelUps.map(levelUp => ({ ...levelUp, announced: true }));
		state.accoladeUnlocks = state.accoladeUnlocks.map(unlock => ({ ...unlock, announced: true }));
		await saveMilestones(state);
	});
}

/** A recent level-up Home hasn't celebrated yet (the latest). */
export async function pendingCelebration(): Promise<LevelUp | null> {
	const state = await readMilestones();
	const levelUp = state.levelUps.at(-1);
	if (!levelUp || levelUp.celebrated || Date.now() - levelUp.at > CELEBRATE_WITHIN_MS) return null;
	return levelUp;
}

export function markCelebrated(): Promise<void> {
	return queued(async () => {
		const state = await readMilestones();
		state.levelUps = state.levelUps.map(levelUp => ({ ...levelUp, celebrated: true }));
		await saveMilestones(state);
	});
}

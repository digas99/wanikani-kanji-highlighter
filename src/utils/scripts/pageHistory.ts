import { storage } from '#imports';
import type { PageStats } from './pageStats';
import { cleanSentence } from './pageSentences';
import { sentenceWordReader } from './sentenceWords';

/**
 * Pages read, with their reading stats (Settings → Page reading level → Keep a history).
 * Only on this device; written by the background when a page asks (never in incognito).
 */

const STORAGE_KEY = 'local:pageHistory';
/** pages kept (Settings → Reading → Pages kept: `page_stats.history_size`) */
export const DEFAULT_PAGE_HISTORY = 300;
export const PAGE_HISTORY_SIZES = [100, 200, 300, 500, 1000];

/** The pages to keep, from the settings. */
export function pageHistorySize(settings: any): number {
	const size = Number(settings?.page_stats?.history_size);
	return PAGE_HISTORY_SIZES.includes(size) ? size : DEFAULT_PAGE_HISTORY;
}

/**
 * Sentences of pages that left the history (the oldest, past its size): kept on their own, so
 * a subject's "From your reading" still has them. Removing a page (or a site's sentences, or all
 * of them) removes them here too: only the history running full keeps them.
 */
const ARCHIVE_KEY = 'local:sentenceArchive';
export const MAX_ARCHIVED_SENTENCES = 5000;
/** over the cap: trimmed down to this (in batches: not a recount on every page) */
const ARCHIVE_TRIM_TO = Math.round(MAX_ARCHIVED_SENTENCES * 0.95);
/** sentences kept, whatever their age, while a subject in them has this few */
export const MIN_SENTENCES_PER_SUBJECT = 3;
/** past this, even those go (the oldest): nearly every sentence has something rare */
const ARCHIVE_CEILING = Math.round(MAX_ARCHIVED_SENTENCES * 1.5);

export type ArchivedSentence = {
	sentence: string;
	translation?: string;
	url: string;
	host: string;
	title: string;
	/** the page's last visit */
	at: number;
	/** the WaniKani subjects in it ("k:日", "w:日本"), worked out when archived */
	subjects?: string[];
};

type ArchiveState = { version: 1; items: ArchivedSentence[] };

export type PageHistoryEntry = {
	/** without the #fragment: one entry per page */
	url: string;
	title: string;
	host: string;
	/** last visit */
	at: number;
	stats: PageStats;
	/** a few of its sentences, to study with (Keep example sentences; pageSentences.ts) */
	sentences?: string[];
	/** sentence (as shown, cleaned) → its translation, asked for one at a time (sentenceTranslation.ts) */
	translations?: Record<string, string>;
};

type PageHistoryState = { version: 1; entries: PageHistoryEntry[] };

export function pageKey(url: string): string {
	try {
		const parsed = new URL(url);
		parsed.hash = '';
		return parsed.toString();
	} catch {
		return url;
	}
}

export async function readPageHistory(): Promise<PageHistoryEntry[]> {
	const saved = await storage.getItem<PageHistoryState>(STORAGE_KEY);
	return saved?.version === 1 ? saved.entries : [];
}

export function watchPageHistory(callback: (entries: PageHistoryEntry[]) => void): () => void {
	return storage.watch<PageHistoryState>(STORAGE_KEY, state => callback(state?.version === 1 ? state.entries : []));
}

export async function readSentenceArchive(): Promise<ArchivedSentence[]> {
	const saved = await storage.getItem<ArchiveState>(ARCHIVE_KEY);
	return saved?.version === 1 ? saved.items : [];
}

export function watchSentenceArchive(callback: (items: ArchivedSentence[]) => void): () => void {
	return storage.watch<ArchiveState>(ARCHIVE_KEY, state => callback(state?.version === 1 ? state.items : []));
}

async function writeArchive(items: ArchivedSentence[]): Promise<void> {
	if (!items.length) await storage.removeItem(ARCHIVE_KEY);
	else await storage.setItem<ArchiveState>(ARCHIVE_KEY, { version: 1, items });
}

/**
 * The archive over its cap (`items`: newest first): down to ARCHIVE_TRIM_TO, the oldest first,
 * but not a sentence one of whose subjects would be left with fewer than
 * MIN_SENTENCES_PER_SUBJECT sentences (counted over the history's and the archive's), so rare
 * words keep their examples. Past ARCHIVE_CEILING, the oldest go whatever they hold.
 */
async function trimArchive(items: ArchivedSentence[]): Promise<ArchivedSentence[]> {
	if (items.length <= MAX_ARCHIVED_SENTENCES) return items;
	const reader = await sentenceWordReader().catch(() => null);
	// no word data (yet): the plain cap, the oldest go
	if (!reader) return items.slice(0, MAX_ARCHIVED_SENTENCES);

	for (const item of items) item.subjects ??= reader.subjects(item.sentence);
	const counts = new Map<string, number>();
	const count = (subjects: string[]) => {
		for (const subject of subjects) counts.set(subject, (counts.get(subject) ?? 0) + 1);
	};
	for (const item of items) count(item.subjects!);
	for (const entry of await readPageHistory()) {
		for (const kept of entry.sentences ?? []) count(reader.subjects(cleanSentence(kept)));
	}

	const dropped = new Set<ArchivedSentence>();
	// the oldest first: a sentence goes if every subject in it keeps enough without it
	for (let index = items.length - 1; index >= 0 && items.length - dropped.size > ARCHIVE_TRIM_TO; index--) {
		const subjects = items[index].subjects!;
		if (subjects.some(subject => (counts.get(subject) ?? 0) <= MIN_SENTENCES_PER_SUBJECT)) continue;
		for (const subject of subjects) counts.set(subject, counts.get(subject)! - 1);
		dropped.add(items[index]);
	}
	const kept = items.filter(item => !dropped.has(item));
	// too many protected: the safety valve
	return kept.length > ARCHIVE_CEILING ? kept.slice(0, ARCHIVE_CEILING) : kept;
}

/** Pages leaving the history (it ran full): their sentences (and translations) into the archive, newest first. */
async function archiveSentencesOf(entries: PageHistoryEntry[]): Promise<void> {
	const leaving = entries.filter(entry => entry.sentences?.length);
	if (!leaving.length) return;
	const items = await readSentenceArchive();
	const known = new Set(items.map(item => `${item.url}\n${item.sentence}`));
	// what each sentence teaches, for trimming later (none yet: worked out then)
	const reader = await sentenceWordReader().catch(() => null);
	for (const entry of leaving) {
		for (const kept of entry.sentences!) {
			const sentence = cleanSentence(kept);
			if (!sentence || known.has(`${entry.url}\n${sentence}`)) continue;
			known.add(`${entry.url}\n${sentence}`);
			const translation = entry.translations?.[sentence];
			items.push({
				sentence,
				url: entry.url,
				host: entry.host,
				title: entry.title,
				at: entry.at,
				...(translation ? { translation } : {}),
				...(reader ? { subjects: reader.subjects(sentence) } : {}),
			});
		}
	}
	await writeArchive(await trimArchive(items.sort((a, b) => b.at - a.at)));
}

/** Archived sentences gone: of these sites, or this page, or all (neither). */
async function removeArchived(hosts?: string[], url?: string): Promise<void> {
	const items = await readSentenceArchive();
	if (!items.length) return;
	const kept = hosts || url
		? items.filter(item => !(hosts?.includes(item.host) || item.url === url))
		: [];
	if (kept.length !== items.length) await writeArchive(kept);
}

/** An archived sentence's translation, kept with it. */
export function saveArchivedTranslation(url: string, sentence: string, translation: string): Promise<void> {
	const run = queue.then(async () => {
		const items = await readSentenceArchive();
		const item = items.find(entry => entry.url === url && entry.sentence === sentence);
		if (!item) return;
		item.translation = translation;
		await writeArchive(items);
	});
	queue = run.catch(() => {});
	return run;
}

/** A backup's archived sentences, merged in (the ones not here yet). How many were added. */
export function importSentenceArchive(imported: ArchivedSentence[]): Promise<number> {
	const run = queue.then(async () => {
		const items = await readSentenceArchive();
		const known = new Set(items.map(item => `${item.url}\n${item.sentence}`));
		let added = 0;
		for (const item of imported) {
			if (typeof item?.sentence !== 'string' || typeof item.url !== 'string' || known.has(`${item.url}\n${item.sentence}`)) continue;
			known.add(`${item.url}\n${item.sentence}`);
			items.push({
				sentence: item.sentence,
				url: item.url,
				host: String(item.host ?? ''),
				title: String(item.title ?? ''),
				at: Number(item.at) || 0,
				...(typeof item.translation === 'string' ? { translation: item.translation } : {}),
				...(Array.isArray(item.subjects) ? { subjects: item.subjects.filter(subject => typeof subject === 'string') } : {}),
			});
			added++;
		}
		await writeArchive(await trimArchive(items.sort((a, b) => b.at - a.at)));
		return added;
	});
	queue = run.catch(() => {});
	return run;
}

/**
 * Whether a page had this kanji / word: kanji from the page's kanji (always kept); words from
 * its WaniKani words (kept when the page was counted by words). Radicals: never.
 */
export function pageHasSubject(entry: PageHistoryEntry, subject: { type?: string; characters?: string | null }): boolean {
	const characters = subject.characters;
	if (!characters) return false;
	const { stats } = entry;
	if (subject.type === 'kanji') {
		return `${stats.learned ?? ''}${stats.notLearned ?? ''}${stats.other ?? ''}`.includes(characters);
	}
	if (subject.type === 'vocabulary' || subject.type === 'kana_vocabulary') {
		return Boolean(stats.learnedWords?.includes(characters) || stats.notLearnedWords?.includes(characters));
	}
	return false;
}

/** The pages a subject was seen on: how many, and the latest one. */
export function subjectSightings(entries: PageHistoryEntry[], subject: { type?: string; characters?: string | null }) {
	const pages = entries.filter(entry => pageHasSubject(entry, subject));
	const last = pages.reduce<PageHistoryEntry | null>((latest, entry) => (!latest || entry.at > latest.at ? entry : latest), null);
	return { count: pages.length, last };
}

/** The translations of the sentences still there (a translation's key: its sentence, cleaned). */
function keptTranslations(translations: Record<string, string> | undefined, sentences: string[] | undefined) {
	if (!translations || !sentences?.length) return undefined;
	const shown = new Set(sentences.map(cleanSentence));
	const kept = Object.fromEntries(Object.entries(translations).filter(([sentence]) => shown.has(sentence)));
	return Object.keys(kept).length ? kept : undefined;
}

let queue: Promise<unknown> = Promise.resolve();

/** Share of their kanji and words two pages must have in common to be the same page, really. */
const SAME_SUBJECTS = 0.8;
/** …and of their sentences, when they have some. */
const SAME_SENTENCES = 0.6;

/** The kanji and words a page's record counted. */
function subjectsOf(stats: PageStats): Set<string> {
	const subjects = new Set<string>(`${stats.learned ?? ''}${stats.notLearned ?? ''}${stats.other ?? ''}`);
	for (const word of [...(stats.learnedWords ?? []), ...(stats.notLearnedWords ?? [])]) subjects.add(`w:${word}`);
	return subjects;
}

/** What two sets have in common, out of all they have (Jaccard). */
function overlap(a: Set<string>, b: Set<string>): number {
	let common = 0;
	for (const item of a) if (b.has(item)) common++;
	const all = a.size + b.size - common;
	return all ? common / all : 1;
}

/**
 * Another address, but the same page really: same site, mostly the same kanji and words, and no
 * sentences on either, or mostly the same ones (e.g. a page with tracking parameters, a feed seen
 * at different scroll positions, a search sorted another way).
 */
export function sameReading(a: PageHistoryEntry, b: PageHistoryEntry): boolean {
	if (a.url === b.url || a.host !== b.host) return false;
	if (overlap(subjectsOf(a.stats), subjectsOf(b.stats)) < SAME_SUBJECTS) return false;
	const sentencesA = new Set((a.sentences ?? []).map(cleanSentence));
	const sentencesB = new Set((b.sentences ?? []).map(cleanSentence));
	if (!sentencesA.size && !sentencesB.size) return true;
	if (!sentencesA.size || !sentencesB.size) return false;
	return overlap(sentencesA, sentencesB) >= SAME_SENTENCES;
}

/**
 * Newest first; a page seen again moves to the top with its latest stats (its sentences kept,
 * when none came this time). Older pages that are the same reading (sameReading) go: only the
 * latest stays, with the translations they had of its sentences.
 */
export function recordPage(entry: PageHistoryEntry, size = DEFAULT_PAGE_HISTORY): Promise<void> {
	const run = queue.then(async () => {
		const all = await readPageHistory();
		const previous = all.find(existing => existing.url === entry.url);
		const sentences = entry.sentences?.length ? entry.sentences : previous?.sentences;
		const recorded = { ...entry, ...(sentences?.length ? { sentences } : {}) };
		const repeats = all.filter(existing => sameReading(recorded, existing));
		// the translations already asked for stay (those of sentences still kept)
		const translations = keptTranslations(
			Object.assign({}, ...repeats.map(repeat => repeat.translations ?? {}), previous?.translations ?? {}),
			sentences,
		);
		const entries = [{
			...recorded,
			...(translations ? { translations } : {}),
		}, ...all.filter(existing => existing.url !== entry.url && !repeats.includes(existing))];
		// their sentences the latest doesn't have: kept, in the archive (as a page's leaving the history)
		const kept = new Set((sentences ?? []).map(cleanSentence));
		await archiveSentencesOf(repeats
			.map(repeat => ({ ...repeat, sentences: (repeat.sentences ?? []).filter(sentence => !kept.has(cleanSentence(sentence))) }))
			.filter(repeat => repeat.sentences.length));
		// the history full: the oldest pages go, their sentences into the archive
		await archiveSentencesOf(entries.slice(size));
		await storage.setItem<PageHistoryState>(STORAGE_KEY, { version: 1, entries: entries.slice(0, size) });
	});
	queue = run.catch(() => {});
	return run;
}

/** A backup's pages, merged in: one entry per page (its latest visit), newest first. */
export function importPageHistory(imported: PageHistoryEntry[], size = DEFAULT_PAGE_HISTORY): Promise<number> {
	const run = queue.then(async () => {
		const byUrl = new Map((await readPageHistory()).map(entry => [entry.url, entry]));
		let added = 0;
		for (const entry of imported) {
			if (!entry?.url || !entry.stats || !Number.isFinite(entry.at)) continue;
			const current = byUrl.get(entry.url);
			if (!current) added++;
			// a newer visit from the backup: its stats, the sentences kept here staying
			if (!current || entry.at > current.at) {
				const { sentences: _ignored, translations: _alsoIgnored, ...visit } = entry;
				byUrl.set(entry.url, current?.sentences?.length
					? { ...visit, sentences: current.sentences, ...(current.translations ? { translations: current.translations } : {}) }
					: visit);
			}
		}
		const entries = [...byUrl.values()].sort((a, b) => b.at - a.at);
		// past the history's size: the oldest go, their sentences into the archive
		await archiveSentencesOf(entries.slice(size));
		await storage.setItem<PageHistoryState>(STORAGE_KEY, { version: 1, entries: entries.slice(0, size) });
		return added;
	});
	queue = run.catch(() => {});
	return run;
}

/**
 * A backup's sentences (their own part, with their translations), onto the pages here that have
 * none. How many pages got some.
 */
export function importPageSentences(imported: Array<{ url: string; sentences: string[]; translations?: Record<string, string> }>): Promise<number> {
	const run = queue.then(async () => {
		const byUrl = new Map(imported
			.filter(item => typeof item?.url === 'string' && Array.isArray(item.sentences))
			.map(item => [item.url, {
				sentences: item.sentences.filter(sentence => typeof sentence === 'string').slice(0, 20),
				translations: item.translations && typeof item.translations === 'object'
					? Object.fromEntries(Object.entries(item.translations).filter(([, text]) => typeof text === 'string'))
					: undefined,
			}]));
		let added = 0;
		const entries = (await readPageHistory()).map(entry => {
			const found = byUrl.get(entry.url);
			if (entry.sentences?.length || !found?.sentences.length) return entry;
			added++;
			const translations = keptTranslations(found.translations, found.sentences);
			return { ...entry, sentences: found.sentences, ...(translations ? { translations } : {}) };
		});
		await storage.setItem<PageHistoryState>(STORAGE_KEY, { version: 1, entries });
		return added;
	});
	queue = run.catch(() => {});
	return run;
}

/**
 * No more sentences from these sites, or this page (`url`), or from every page (neither): in
 * the history (the pages stay where they are) and in the archive.
 */
export function removeSentences(hosts?: string[], url?: string): Promise<void> {
	const run = queue.then(async () => {
		const entries = (await readPageHistory()).map(entry => {
			if (!entry.sentences || (hosts && !hosts.includes(entry.host)) || (url && entry.url !== url)) return entry;
			const { sentences: _removed, translations: _theirs, ...rest } = entry;
			return rest;
		});
		await storage.setItem<PageHistoryState>(STORAGE_KEY, { version: 1, entries });
		await removeArchived(hosts, url);
	});
	queue = run.catch(() => {});
	return run;
}

/** A sentence's translation, kept with its page (`sentence`: as shown, cleaned). */
export function saveSentenceTranslation(url: string, sentence: string, translation: string): Promise<void> {
	const run = queue.then(async () => {
		const entries = (await readPageHistory()).map(entry => (entry.url === url
			? { ...entry, translations: { ...(entry.translations ?? {}), [sentence]: translation } }
			: entry));
		await storage.setItem<PageHistoryState>(STORAGE_KEY, { version: 1, entries });
	});
	queue = run.catch(() => {});
	return run;
}

/**
 * One sentence removed (the Sentences page): from its page in the history (with its
 * translation; the page stays), or from the archive.
 */
export function removeOneSentence(url: string, sentence: string): Promise<void> {
	const run = queue.then(async () => {
		const entries = await readPageHistory();
		let changed = false;
		const next = entries.map(entry => {
			if (entry.url !== url || !entry.sentences?.length) return entry;
			const sentences = entry.sentences.filter(kept => cleanSentence(kept) !== sentence);
			if (sentences.length === entry.sentences.length) return entry;
			changed = true;
			const { [sentence]: _gone, ...translations } = entry.translations ?? {};
			const { sentences: _old, translations: _oldTranslations, ...rest } = entry;
			return {
				...rest,
				...(sentences.length ? { sentences } : {}),
				...(Object.keys(translations).length ? { translations } : {}),
			};
		});
		if (changed) await storage.setItem<PageHistoryState>(STORAGE_KEY, { version: 1, entries: next });
		const items = await readSentenceArchive();
		const kept = items.filter(item => !(item.url === url && item.sentence === sentence));
		if (kept.length !== items.length) await writeArchive(kept);
	});
	queue = run.catch(() => {});
	return run;
}

/** A page removed (by you): its archived sentences too (only the history running full keeps them). */
export function removePage(url: string): Promise<void> {
	const run = queue.then(async () => {
		const entries = await readPageHistory();
		await storage.setItem<PageHistoryState>(STORAGE_KEY, { version: 1, entries: entries.filter(entry => entry.url !== url) });
		await removeArchived(undefined, url);
	});
	queue = run.catch(() => {});
	return run;
}

/** The whole history cleared: the archived sentences too. */
export async function clearPageHistory(): Promise<void> {
	await storage.removeItem(STORAGE_KEY);
	await storage.removeItem(ARCHIVE_KEY);
}

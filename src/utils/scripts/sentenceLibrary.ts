import type { ArchivedSentence, PageHistoryEntry } from './pageHistory';
import { cleanSentence } from './pageSentences';

/**
 * Every sentence kept (Keep example sentences), from the pages in the history and the archive
 * (pages that left it), as one list for the Sentences page: newest first, each sentence once.
 */

export type LibrarySentence = {
	/** unique: its page and its text */
	key: string;
	sentence: string;
	translation: string;
	url: string;
	host: string;
	title: string;
	/** the page's last visit */
	at: number;
	/** from a page that left the history (its translation is saved there) */
	archived: boolean;
};

export function librarySentences(entries: PageHistoryEntry[], archive: ArchivedSentence[]): LibrarySentence[] {
	const seen = new Set<string>();
	const list: LibrarySentence[] = [];
	const add = (item: Omit<LibrarySentence, 'key'>) => {
		if (!item.sentence || seen.has(item.sentence)) return;
		seen.add(item.sentence);
		list.push({ ...item, key: `${item.url}\n${item.sentence}` });
	};
	for (const entry of entries) {
		for (const kept of entry.sentences ?? []) {
			// without reference marks ("[19]"; ones kept before they were taken out)
			const sentence = cleanSentence(kept);
			add({
				sentence,
				translation: entry.translations?.[sentence] ?? '',
				url: entry.url,
				host: entry.host,
				title: entry.title || entry.url,
				at: entry.at,
				archived: false,
			});
		}
	}
	for (const item of archive) {
		add({
			sentence: item.sentence,
			translation: item.translation ?? '',
			url: item.url,
			host: item.host,
			title: item.title || item.url,
			at: item.at,
			archived: true,
		});
	}
	return list.sort((a, b) => b.at - a.at);
}

/**
 * The sentences as a tab-separated file for Anki (File → Import): sentence, translation, source,
 * its WaniKani words / kanji (`subjectsOf`), the date read. Tabs and line breaks in the text
 * become spaces.
 */
export function sentencesAsAnkiFile(sentences: LibrarySentence[], subjectsOf: (sentence: string) => string[]): string {
	const field = (value: string) => value.replace(/[\t\r\n]+/g, ' ').trim();
	const lines = [
		'#separator:tab',
		'#html:false',
		'#columns:Sentence\tTranslation\tSource\tSubjects\tRead',
	];
	for (const item of sentences) {
		lines.push([
			field(item.sentence),
			field(item.translation),
			field(item.url),
			field(subjectsOf(item.sentence).map(subject => subject.slice(2)).join(' ')),
			new Date(item.at).toISOString().slice(0, 10),
		].join('\t'));
	}
	return `${lines.join('\n')}\n`;
}

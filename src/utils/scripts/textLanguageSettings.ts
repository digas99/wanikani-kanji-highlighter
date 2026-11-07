/**
 * Settings → Highlight: what's done with Chinese text, and with text that could be Japanese or
 * Chinese (only kanji both use, on a page that doesn't tell). See cjk-highlighter/textLanguage.ts.
 */

import { matchesSiteList } from '@/utils/scripts/pageList';
import { LanguageGate, type LanguageChoice, type LanguageRules } from 'cjk-highlighter';

/** The sites where text that could be either goes the other way from the setting. */
export const UNCLEAR_TEXT_SITES_KEY = 'local:unclearTextSites';

export const CHINESE_TEXT_OPTIONS = [
	{ value: 'highlight', label: 'Highlight its kanji' },
	{ value: 'skip', label: "Don't highlight" },
];

export const UNCLEAR_TEXT_OPTIONS = [
	{ value: 'highlight', label: 'Highlight' },
	{ value: 'skip', label: "Don't highlight" },
];

type KanjiData = { japanese?: string; learned?: string; notLearned?: string; byStage?: Record<string, string> } | null | undefined;

/**
 * The rules on this site (Settings → Highlight → Japanese or Chinese). Null when nothing is left
 * out (both highlighted, the default): then nothing needs classifying. `always`: the rules even
 * then (development: the classification panel).
 */
export function languageRules(settings: any, kanji: KanjiData, unclearTextSites: string[] | null | undefined, host: string, always = false): LanguageRules | null {
	const chinese: LanguageChoice = settings?.highlighter?.chinese_text === 'skip' ? 'skip' : 'highlight';
	const byDefault: LanguageChoice = settings?.highlighter?.unclear_text === 'skip' ? 'skip' : 'highlight';
	// the sites listed go the other way
	const unclear: LanguageChoice = matchesSiteList(host, unclearTextSites)
		? (byDefault === 'skip' ? 'highlight' : 'skip')
		: byDefault;
	if (!always && !LanguageGate.needed(chinese, unclear)) return null;
	// the kanji Japanese uses: Jōyō and Jinmeiyō, and WaniKani's (a few are neither)
	const japaneseKanji = new Set<string>([
		...(kanji?.japanese ?? ''),
		...(kanji?.learned ?? ''),
		...(kanji?.notLearned ?? ''),
		...Object.values(kanji?.byStage ?? {}).join(''),
	]);
	return { japaneseKanji, chinese, unclear };
}

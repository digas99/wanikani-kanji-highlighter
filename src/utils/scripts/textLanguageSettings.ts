/**
 * Settings → Highlight: what's done with Chinese text, and with text that could be Japanese or
 * Chinese (only kanji both use, on a page that doesn't tell). See cjk-highlighter/textLanguage.ts.
 */

import { matchesSiteList } from '@/utils/scripts/pageList';
import { LanguageGate, shareChoices, type LanguageChoice, type LanguageChoices, type LanguageRules, type PeerInfo } from 'cjk-highlighter';

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

/** Text that could be either, when its page doesn't tell: the setting, the other way on the sites listed. */
export function unclearChoice(settings: any, unclearTextSites: string[] | null | undefined, host: string): LanguageChoice {
	const byDefault: LanguageChoice = settings?.highlighter?.unclear_text === 'skip' ? 'skip' : 'highlight';
	return matchesSiteList(host, unclearTextSites)
		? (byDefault === 'skip' ? 'highlight' : 'skip')
		: byDefault;
}

/** This extension's choices on this site (the exceptions applied), as said to the other highlighters. */
export function siteChoices(settings: any, unclearTextSites: string[] | null | undefined, host: string): LanguageChoices {
	return {
		japanese: settings?.highlighter?.japanese_text === 'skip' ? 'skip' : 'highlight',
		chinese: settings?.highlighter?.chinese_text === 'skip' ? 'skip' : 'highlight',
		unclear: unclearChoice(settings, unclearTextSites, host),
	};
}

/**
 * The rules on this site (Settings → Highlight → Japanese or Chinese), split with `partner` when
 * a Chinese highlighter shares the page (it takes the Chinese text: cjk-highlighter's
 * coexistence). Null when nothing is left out (both highlighted, the default): then nothing needs
 * classifying. `always`: the rules even then (development: the classification panel).
 */
export function languageRules(
	settings: any,
	kanji: KanjiData,
	unclearTextSites: string[] | null | undefined,
	host: string,
	always = false,
	partner: PeerInfo | null = null,
): LanguageRules | null {
	const { japanese, chinese, unclear } = shareChoices(siteChoices(settings, unclearTextSites, host), 'japanese', partner);
	if (!always && !LanguageGate.needed(chinese, unclear, japanese)) return null;
	// the kanji Japanese uses: Jōyō and Jinmeiyō, and WaniKani's (a few are neither)
	const japaneseKanji = new Set<string>([
		...(kanji?.japanese ?? ''),
		...(kanji?.learned ?? ''),
		...(kanji?.notLearned ?? ''),
		...Object.values(kanji?.byStage ?? {}).join(''),
	]);
	return { japaneseKanji, japanese, chinese, unclear };
}

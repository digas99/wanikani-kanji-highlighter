/**
 * A subject's Chinese forms, traditional and simplified (Settings → Details → Chinese forms, shown
 * next to the subject on WaniKani's pages: highlight/chineseForms.ts). From public/chinese-forms.json
 * (scripts/build-chinese-forms.mjs: OpenCC, CC-CEDICT), read by the background.
 *
 * A lone kanji can have several (弁: 辨 辯 瓣); a word goes character by character, so it isn't
 * necessarily a Chinese word. Kanji Chinese doesn't use at all (働, 込: made in Japan) are named.
 */

export type ChineseFormsData = {
	/** kanji → its traditional forms, where they differ (space-separated) */
	traditional: Record<string, string>;
	/** traditional → simplified, where they differ */
	simplified: Record<string, string>;
	/** the kanji Chinese doesn't use */
	notChinese: string;
};

export type ChineseForms = {
	traditional: string[];
	simplified: string[];
	/** which of the subject's kanji Chinese doesn't use */
	notChinese: string;
};

const ONLY_HAN = /^\p{Script=Han}+$/u;
const unique = (list: string[]) => [...new Set(list)];

/** Null when it isn't kanji only (a word with kana: 食べる). */
export function chineseForms(data: ChineseFormsData, text: string): ChineseForms | null {
	const clean = text.replace(/\s/g, '');
	if (!ONLY_HAN.test(clean)) return null;
	const characters = [...clean];
	const traditionalOf = (char: string) => (data.traditional[char] ?? char).split(' ');
	const traditional = characters.length === 1
		? traditionalOf(clean)
		: [characters.map(char => traditionalOf(char)[0]).join('')];
	const simplified = unique(traditional.map(form => [...form].map(char => data.simplified[char] ?? char).join('')));
	const notChinese = unique(characters.filter(char => data.notChinese.includes(char))).join('');
	return { traditional, simplified, notChinese };
}

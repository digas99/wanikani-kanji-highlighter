import { toHiragana, toKatakana } from 'wanakana';

/**
 * Romaji typed into kana (the search fields' あ mode), as an IME does (a lone "n" waits for the
 * next key). Each run of letters on its own:
 *  - ALL CAPS → katakana (WATER → ワテr, AI → アイ)
 *  - any other case, camelCase included → hiragana (Water, aWay, cAR, water → わてr, あわy, かr)
 * A single capital at the end waits too: it could start ALL CAPS (AI) or a camelCase word (Away).
 */
export function typeKana(text: string): string {
	return text.replace(/[A-Za-z'-]+/g, (run, offset: number) => {
		const atEnd = offset + run.length === text.length;
		if (atEnd && run.length === 1 && /[A-Z]/.test(run)) return run;
		const letters = run.replace(/[^A-Za-z]/g, '');
		const allCaps = letters.length > 0 && letters === letters.toUpperCase();
		const lower = run.toLowerCase();
		return allCaps ? toKatakana(lower, { IMEMode: true }) : toHiragana(lower, { IMEMode: true });
	});
}

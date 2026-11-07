// Generates public/chinese-forms.json: a kanji's traditional and simplified Chinese forms, shown next
// to the subject on WaniKani's pages (Settings → Details → Chinese forms, off by default).
// Rerun it to update the data: npm run build:chinese-forms
//
// Japanese → traditional comes from OpenCC's shinjitai table (気 → 氣), else its Japanese variants
// table the other way (喩 → 喻), normalised with its Taiwan table to today's forms (爲 → 為);
// traditional → simplified from its own (氣 → 气). Characters that
// aren't in CC-CEDICT at all are listed as not used in Chinese (働, 込, 畑: Japanese-made kanji).
// Only the Jōyō and Jinmeiyō kanji are covered (schoolKanjiMaps.json): those are WaniKani's.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OPENCC = 'https://raw.githubusercontent.com/BYVoid/OpenCC/master';
const CEDICT = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

async function download(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url} answered ${response.status}`);
	return Buffer.from(await response.arrayBuffer());
}

/** `ref`: a branch or tag (JPVariants is only in older releases) */
async function openccTable(name, ref = 'master') {
	const text = (await download(`${OPENCC.replace('/master', `/${ref}`)}/data/dictionary/${name}.txt`)).toString('utf8');
	const table = new Map();
	for (const line of text.split('\n')) {
		if (line.startsWith('#') || !line.includes('\t')) continue;
		const [key, values] = line.trim().split('\t');
		table.set(key, values.split(' '));
	}
	if (table.size < 10) throw new Error(`${name} looks wrong: ${table.size} entries`);
	return table;
}

const unique = list => [...new Set(list)];

const maps = JSON.parse(await readFile(join(ROOT, 'src/utils/scripts/schoolKanjiMaps.json'), 'utf8'));
// a few old forms are written with compatibility code points (欄 U+F91D): the same as their usual one
const kanji = unique([...Object.values(maps.joyo).flat(), ...maps.jinmeiyo].join('')).filter(char => char.normalize('NFC') === char);
if (kanji.length < 2500) throw new Error('The kanji lists look wrong');

const [shinjitai, jpVariants, tsChars, twVariants] = await Promise.all([
	openccTable('JPShinjitaiCharacters'),
	openccTable('JPVariants', 'ver.1.1.9'),
	openccTable('TSCharacters'),
	openccTable('TWVariants'),
]);
// JPVariants: traditional → its Japanese variants; here the other way
const fromVariant = new Map();
for (const [form, variants] of jpVariants) {
	for (const variant of variants) if (variant !== form) fromVariant.set(variant, unique([...(fromVariant.get(variant) ?? []), form]));
}
const cedictText = gunzipSync(await download(CEDICT)).toString('utf8');
const cedictDate = /^#! date=(\S+)/m.exec(cedictText)?.[1] ?? null;

// every character CC-CEDICT knows, traditional or simplified
const chinese = new Set();
for (const line of cedictText.split('\n')) {
	const entry = /^(\S+) (\S+) \[/.exec(line);
	if (!entry || line.startsWith('#')) continue;
	for (const char of entry[1] + entry[2]) chinese.add(char);
}

const normalise = char => twVariants.get(char)?.[0] ?? char;

/** kanji → its traditional forms (only where they differ from the kanji) */
const traditional = {};
/** traditional → simplified (only where they differ), for the traditional forms reached */
const simplified = {};
let notChinese = '';
for (const char of kanji) {
	const forms = unique((shinjitai.get(char) ?? fromVariant.get(char) ?? [char]).map(normalise));
	if (!(forms.length === 1 && forms[0] === char)) traditional[char] = forms.join(' ');
	for (const form of forms) {
		const simple = tsChars.get(form)?.[0];
		if (simple && simple !== form) simplified[form] = simple;
	}
	if (!chinese.has(char) && !forms.some(form => chinese.has(form))) notChinese += char;
}

const data = {
	meta: {
		sources: ['OpenCC (Apache-2.0): JPShinjitaiCharacters, JPVariants, TSCharacters, TWVariants', `CC-CEDICT (CC BY-SA 4.0)${cedictDate ? `, ${cedictDate}` : ''}`],
	},
	traditional,
	simplified,
	notChinese,
};
await writeFile(join(ROOT, 'public/chinese-forms.json'), `${JSON.stringify(data)}\n`);
console.log(`chinese-forms.json: ${Object.keys(traditional).length} kanji with other traditional forms, ${Object.keys(simplified).length} simplified, ${notChinese.length} not used in Chinese`);

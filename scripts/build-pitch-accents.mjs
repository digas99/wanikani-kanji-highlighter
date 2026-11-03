// Builds the pitch accent lookup files (public/pitch/*.json) from Kanjium's accents.txt.
//
//   node scripts/build-pitch-accents.mjs <path to accents.txt>
//
// Source: https://github.com/mifunetoshiro/kanjium (data/source_files/raw/accents.txt),
// CC BY-SA 4.0 — the generated files stay under that license (see public/pitch/LICENSE.txt).
// Lines: word <tab> reading (hiragana; empty for kana-only words) <tab> accents
// ("0", "0,3", "(副)0,(名)3").
//
// Only needs re-running if Kanjium publishes new data: lookups cover every word in it,
// so vocabulary WaniKani adds later is found without a rebuild.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHARD_COUNT = 256;
const source = process.argv[2];
if (!source) {
	console.error('Usage: node scripts/build-pitch-accents.mjs <path to accents.txt>');
	process.exit(1);
}

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'pitch');

/** Same as pitchShardKey() in src/utils/scripts/pitchAccent.ts. */
function shardKey(word) {
	return (word.codePointAt(0) % SHARD_COUNT).toString(16).padStart(2, '0');
}

const shards = new Map();
let entries = 0;
for (const line of fs.readFileSync(source, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
	const [word, readingColumn, accents] = line.split('\t');
	// kana-only words leave the reading empty: the word is its reading
	const reading = readingColumn || word;
	if (!word || !accents) continue;
	const key = shardKey(word);
	if (!shards.has(key)) shards.set(key, {});
	const shard = shards.get(key);
	// { word: [[reading, accents], …] }: a word can have several readings
	(shard[word] ??= []).push([reading, accents.trim()]);
	entries += 1;
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
let bytes = 0;
for (const [key, shard] of shards) {
	const json = JSON.stringify(shard);
	bytes += Buffer.byteLength(json);
	fs.writeFileSync(path.join(outDir, `${key}.json`), json);
}
fs.writeFileSync(path.join(outDir, 'LICENSE.txt'), [
	'Pitch accent data from Kanjium (https://github.com/mifunetoshiro/kanjium),',
	'by Uros O., licensed under Creative Commons Attribution-ShareAlike 4.0 International',
	'(https://creativecommons.org/licenses/by-sa/4.0/).',
	'',
	'Converted from data/source_files/raw/accents.txt into lookup files (split by the',
	'first character of each word) by scripts/build-pitch-accents.mjs. These files are',
	'shared under the same license.',
	'',
].join('\n'));

console.log(`${entries} entries in ${shards.size} files, ${(bytes / 1024 / 1024).toFixed(2)} MB → ${outDir}`);

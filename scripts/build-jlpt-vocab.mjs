// Builds src/utils/scripts/jlptVocab.json: the JLPT level of words, from Jonathan Waller's
// JLPT lists (tanos.co.uk, Creative Commons BY), as parsed by github.com/Bluskyo/JLPT_Vocabulary
// (data/vocab/results/JLPT_vocab_ALL.json: { word: [{ reading, level }] }).
//
//   node scripts/build-jlpt-vocab.mjs path/to/JLPT_vocab_ALL.json
//
// A word listed at several levels gets the easiest one (N5 before N1).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const source = process.argv[2];
if (!source) {
	console.error('usage: node scripts/build-jlpt-vocab.mjs path/to/JLPT_vocab_ALL.json');
	process.exit(1);
}

const entries = JSON.parse(readFileSync(source, 'utf8'));
const levels = { n5: [], n4: [], n3: [], n2: [], n1: [] };
for (const [word, readings] of Object.entries(entries)) {
	const level = Math.max(...readings.map(entry => Number(entry.level)).filter(value => value >= 1 && value <= 5));
	if (!Number.isFinite(level)) continue;
	levels[`n${level}`].push(word);
}

const output = {
	source: 'JLPT vocabulary lists by Jonathan Waller (tanos.co.uk/jlpt), licensed Creative Commons BY; parsed by github.com/Bluskyo/JLPT_Vocabulary (MIT)',
	...levels,
};
const target = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/utils/scripts/jlptVocab.json');
writeFileSync(target, JSON.stringify(output));
console.log(Object.entries(levels).map(([level, words]) => `${level}: ${words.length}`).join(', '), `→ ${target}`);

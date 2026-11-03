export const srsStages = {
	0: { name: "Initiate", short: "Int", color: "#c1c0c1" },
	1: { name: "Apprentice I", short: "Ap1", color: "#cf72b0" },
	2: { name: "Apprentice II", short: "Ap2", color: "#d560ad" },
	3: { name: "Apprentice III", short: "Ap3", color: "#db44a9" },
	4: { name: "Apprentice IV", short: "Ap4", color: "#dd0093" },
	5: { name: "Guru I", short: "Gr1", color: "#894e97" },
	6: { name: "Guru II", short: "Gr2", color: "#882d9e" },
	7: { name: "Master", short: "Mst", color: "#294ddb" },
	8: { name: "Enlightened", short: "Enl", color: "#0093dd" },
	9: { name: "Burned", short: "Brn", color: "#e20000" },
};

export const typeColors = {
	"radical": "#00a1f1",
	"kanji": "#f100a1",
	"vocabulary": "#a100f1",
	"kana_vocabulary": "#a100f1"
};

export const subjectDisplay = {
	srsStageName(item: any, srsStages: any) {
		const stage = item?.assignment?.srs_stage ?? item?.srs_stage;
		if (stage === undefined || stage === null) return "Locked";
		return srsStages[stage]?.name || "Locked";
	},
	srsStageColor(item: any, srsStages: any) {
		const stage = item?.assignment?.srs_stage ?? item?.srs_stage;
		if (stage === undefined || stage === null) return "#888";
		return srsStages[stage]?.color || "#888";
	},
	partsOfSpeech(item: any) {
		return item.parts_of_speech.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
	},
	joinMeanings(item: any) {
		return item.meanings.map((m: any) => m.meaning).join(', ');
	},
	onyomiReadings(item: any) {
		return (item.readings ?? []).filter((r: any) => r.type === 'onyomi').map((r: any) => r.reading).join(', ');
	},
	kunyomiReadings(item: any) {
		return (item.readings ?? []).filter((r: any) => r.type === 'kunyomi').map((r: any) => r.reading).join(', ');
	},
	readings(item: any) {
		return (item.readings ?? []).map((r: any) => r.reading).join(', ');
	},
	filterByType(item: any, type: string) {
		let itemType = item.type === 'kana_vocabulary' ? 'vocabulary' : item.type;
		return itemType === type;
	}
};

// custom level up progression
export const SRS_STAGE_INTERVALS: Record<number, number> = {
	0: 0,
	1: 14400000,
	2: 28800000,
	3: 82800000,
	4: 169200000,
};

export const levelUpInfo = (subjects: Array<any>) => {
	const kanji = subjects.filter(subject => subject.type == "kanji" && !subject.assignment?.hidden);
	const stageOf = (subject: any) => subject.assignment?.srs_stage ?? 0;

	// 90% of the level's kanji are needed to level up.
	// (`slice(0, -0)` would return nothing for levels with fewer than 10 kanji.)
	const sliceSize = Math.floor(kanji.length * 0.1);
	const neededKanji = [...kanji].sort((a, b) => stageOf(b) - stageOf(a))
		.slice(0, kanji.length - sliceSize);

	const passedKanji = neededKanji.filter(subject => subject.assignment?.passed_at);
	const remainingNeededKanji = neededKanji.filter(subject => !subject.assignment?.passed_at && stageOf(subject) > 0);
	const initiatedKanji = [...passedKanji, ...remainingNeededKanji];

	// all size: 5 srs stages per kanji (with 5th being passed)
	const size = neededKanji.length * 5;
	let progress = 0;
	initiatedKanji.forEach(kanji => {
		if (kanji.assignment?.passed_at)
			progress += 5;
		else
			progress += Math.min(stageOf(kanji), 5);
	});
	const percentage = size ? progress / size * 100 : 0;
	return {
		progress: {
			passed: progress,
			size: size,
			percentage: percentage
		},
		subjects: kanji,
		initiated: initiatedKanji,
	};
}

const HOUR_MS = 60 * 60 * 1000;

/** Levels 1–2 are accelerated: shorter Apprentice intervals. */
export const ACCELERATED_STAGE_INTERVALS: Record<number, number> = {
	0: 0,
	1: 2 * HOUR_MS,
	2: 4 * HOUR_MS,
	3: 8 * HOUR_MS,
	4: 23 * HOUR_MS,
};

/** WaniKani schedules the next review at the start of the hour. */
const startOfHour = (time: number) => Math.floor(time / HOUR_MS) * HOUR_MS;

const isUnlocked = (assignment: any) => Boolean(assignment && (assignment.srs_stage != null || assignment.passed_at));

/**
 * Earliest time a subject reaches Guru, answering everything right as soon as it's due.
 * `startAt`: when its lesson can first be done (a locked kanji: when it unlocks).
 */
export function fastestGuruAt(assignment: any, level: number, now = Date.now(), startAt = now): number {
	if (assignment?.passed_at) return Math.min(Date.parse(assignment.passed_at), now);
	const stage = assignment?.srs_stage ?? 0;
	if (stage >= 5) return now;

	const intervals = level <= 2 ? ACCELERATED_STAGE_INTERVALS : SRS_STAGE_INTERVALS;
	const availableAt = assignment?.available_at ? Date.parse(assignment.available_at) : NaN;
	// the next answer: the lesson (stage 0), or the next review once it's due
	let time = stage === 0
		? Math.max(now, startAt)
		: Math.max(now, Number.isFinite(availableAt) ? availableAt : now);
	// each right answer moves up a stage; the next review comes after that stage's interval
	for (let next = stage + 1; next <= 4; next++) {
		time = startOfHour(time + intervals[next]);
	}
	return time;
}

/**
 * Fastest possible level up for a level's subjects, from any point of the level: every
 * radical and kanji answered right, each lesson and review done as soon as it's available.
 *
 * Kanji not unlocked yet are included: a kanji unlocks when its radicals reach Guru, so
 * its fastest Guru time is its slowest radical's plus a full Apprentice → Guru path.
 * Leveling up takes 90% of the level's kanji passed.
 *
 * `assignmentOf` / `levelOf`: for radicals from other levels (not in `subjects`).
 * Returns null when the level is already done, or can't be predicted (a later level).
 */
export function getLevelUpPrediction(
	subjects: Array<any>,
	{ assignmentOf, levelOf }: { assignmentOf?: (id: number) => any; levelOf?: (id: number) => number | undefined } = {},
	now = Date.now(),
) {
	const kanji = subjects.filter(subject => subject.type === 'kanji' && !subject.assignment?.hidden);
	if (!kanji.length) return null;
	const needed = Math.ceil(kanji.length * 0.9);
	if (kanji.filter(subject => subject.assignment?.passed_at).length >= needed) return null;

	const byId = new Map(subjects.map(subject => [subject.id, subject]));
	const radicalGuruAt = (id: number, kanjiLevel: number) => {
		const subject = byId.get(id);
		const assignment = subject?.assignment ?? assignmentOf?.(id);
		// still locked itself: a later level, nothing to predict from
		if (!isUnlocked(assignment)) return Infinity;
		return fastestGuruAt(assignment, subject?.level ?? levelOf?.(id) ?? kanjiLevel, now);
	};

	const times = kanji.map(subject => {
		if (isUnlocked(subject.assignment)) {
			return { subject, time: fastestGuruAt(subject.assignment, subject.level, now), locked: false, unlockAt: null as number | null };
		}
		const radicals: number[] = subject.component_subject_ids ?? [];
		if (!radicals.length) return { subject, time: Infinity, locked: true, unlockAt: null };
		const unlockAt = Math.max(now, ...radicals.map(id => radicalGuruAt(id, subject.level)));
		return { subject, time: fastestGuruAt(null, subject.level, now, unlockAt), locked: true, unlockAt };
	}).sort((a, b) => a.time - b.time);

	const levelUpAt = times[needed - 1].time;
	if (!Number.isFinite(levelUpAt)) return null;
	// a spare kanji ready by then would take the place of one that's late
	const spareCovers = (times[needed]?.time ?? Infinity) <= levelUpAt;

	return {
		intervalMs: Math.max(0, levelUpAt - now),
		canLevelUpNow: levelUpAt <= now,
		levelUpAt: new Date(levelUpAt),
		/** of the kanji it counts on, how many aren't unlocked yet */
		lockedKanji: times.slice(0, needed).filter(entry => entry.locked).length,
		/**
		 * The path: the kanji the level up counts on that aren't passed yet, latest first. `slackMs`:
		 * how late its Guru can be without moving the level up; `critical`: any delay moves it
		 * (no slack, and no spare kanji ready in time to take its place).
		 */
		path: times.slice(0, needed)
			.filter(entry => !entry.subject.assignment?.passed_at)
			.map(entry => {
				const slackMs = Math.max(0, levelUpAt - entry.time);
				return { ...entry, slackMs, critical: slackMs < HOUR_MS && !spareCovers };
			})
			.reverse(),
		/** kanji that can be late (or wrong) without moving the level up: the 10% not needed */
		spare: kanji.length - needed,
	};
}

/** Primary meaning of a subject (falls back to the first one). */
export function primaryMeaning(item: any): string {
	const meanings = item?.meanings;
	if (!Array.isArray(meanings) || !meanings.length) return item?.meaning ?? '';
	return (meanings.find((m: any) => m.primary) ?? meanings[0])?.meaning ?? '';
}

/** Primary reading of a subject; kana vocabulary has none (its characters are the reading). */
export function primaryReading(item: any): string {
	const readings = item?.readings;
	if (!Array.isArray(readings) || !readings.length) return item?.reading ?? '';
	const reading = readings.find((r: any) => r.primary) ?? readings[0];
	return typeof reading === 'string' ? reading : reading?.reading ?? '';
}

/** "日本 · Japan · にほん" style label used for tile tooltips. */
export function subjectSummary(item: any): string {
	return [item?.characters, primaryMeaning(item), primaryReading(item)]
		.filter(Boolean)
		.filter((part, index, parts) => parts.indexOf(part) === index)
		.join(' · ');
}

export const formatSubjectsData = (data: Array<any>) => {
	return data.map(item => ({
		id: item.id,
		type: item.type,
		level: item.level,
		characters: item.characters,
		character_images: item.character_images,
		hidden_at: item.hidden_at ?? null,
		// Keep just enough text for tiles to say what the subject is.
		meaning: primaryMeaning(item),
		reading: primaryReading(item),
		// kanji: the radicals that unlock it (level-up prediction while some are locked)
		...(item.type === 'kanji' && item.component_subject_ids
			? { component_subject_ids: item.component_subject_ids }
			: {}),
		assignment: {
			id: item.assignment?.id,
			srs_stage: item.assignment?.srs_stage,
			subject_type: item.assignment?.subject_type,
			passed_at: item.assignment?.passed_at,
			available_at: item.assignment?.available_at ?? null,
			hidden: item.assignment?.hidden ?? false,
		}
	}));
}
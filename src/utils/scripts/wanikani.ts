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
	const kanji = subjects.filter(subject => subject.type == "kanji" && !subject.assignment.hidden);

	const sliceSize = Math.floor(kanji.length * 0.1);
	const neededKanji = kanji.sort((a, b) => b.assignment.srs_stage - a.assignment.srs_stage)
		.slice(0, -sliceSize);

	const passedKanji = neededKanji.filter(subject => subject.assignment.passed_at);
	const remainingNeededKanji = neededKanji.filter(subject => !subject.assignment.passed_at && subject.assignment.srs_stage > 0);
	const initiatedKanji = [...passedKanji, ...remainingNeededKanji];

	// all size: 5 srs stages per kanji (with 5th being passed)
	const size = neededKanji.length * 5;
	let progress = 0;
	initiatedKanji.forEach(kanji => {
		if (kanji.assignment.passed_at)
			progress += 5;
		else
			progress += kanji.assignment.srs_stage;
	});
	const percentage = progress / size * 100;
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

export function levelUpPredictionMs(subjects: Array<any>, nSubjectsToLevelUp: number): number {
	const discardableSubjects = subjects.length - nSubjectsToLevelUp;
	const notPassedSubjects = subjects.filter(subject => {
		const passedAt = subject.assignment?.passed_at ?? subject.passed_at;
		return passedAt == null;
	});

	const passIntervals = notPassedSubjects.map(subject => {
		let interval = 0;
		const srsStage = subject.assignment?.srs_stage ?? subject.srs_stage ?? 0;
		for (let i = srsStage + 1; i < 5; i++) {
			interval += SRS_STAGE_INTERVALS[i] ?? 0;
		}

		const availableAt = subject.assignment?.available_at ?? subject.available_at;
		const intervalUntilAvailable = availableAt
			? new Date(availableAt).getTime() - Date.now()
			: 0;
		interval += intervalUntilAvailable > 0 ? intervalUntilAvailable : 0;
		return interval;
	});

	const sortedIntervals = passIntervals.sort((a, b) => b - a);
	return sortedIntervals.slice(discardableSubjects)[0] ?? 0;
}

export function getLevelUpPrediction(subjects: Array<any>) {
	const kanji = subjects.filter(subject => subject.type === 'kanji' && !subject.assignment?.hidden);
	const nSubjectsToLevelUp = Math.floor(kanji.length * 0.9) + 1;
	const initiatedSubjects = kanji.filter(subject => (subject.assignment?.srs_stage ?? 0) >= 1);
	const passedSubjects = kanji.filter(subject => subject.assignment?.passed_at);

	if (initiatedSubjects.length < nSubjectsToLevelUp || passedSubjects.length >= nSubjectsToLevelUp) {
		return null;
	}

	const intervalMs = levelUpPredictionMs(kanji, nSubjectsToLevelUp);
	if (intervalMs <= 0) {
		return { intervalMs: 0, canLevelUpNow: true, levelUpAt: new Date() };
	}

	return {
		intervalMs,
		canLevelUpNow: false,
		levelUpAt: new Date(Date.now() + intervalMs),
	};
}

export const formatSubjectsData = (data: Array<any>) => {
	return data.map(item => ({
		id: item.id,
		type: item.type,
		level: item.level,
		characters: item.characters,
		character_images: item.character_images,
		assignment: {
			id: item.assignment?.id,
			srs_stage: item.assignment?.srs_stage,
			subject_type: item.assignment?.subject_type,
			passed_at: item.assignment?.passed_at
		}
	}));
}
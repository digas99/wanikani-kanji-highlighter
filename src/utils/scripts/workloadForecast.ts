/**
 * Workload forecast: the reviews per day coming from what's already scheduled, and from doing
 * N lessons a day. Each subject's reviews are followed through the SRS: answered right (all of
 * it) with the given chance it moves up a stage, else down as WaniKani does (one stage, two from
 * Guru). Reviews are done as soon as they're due. Instead of picking right / wrong at random,
 * each subject is split into both outcomes by their chances (an expected value, the same on
 * every run).
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** WaniKani's intervals (hours) to the next review, by the stage reached (levels 3+). */
const INTERVAL_HOURS: Record<number, number> = {
	1: 4,
	2: 8,
	3: 23,
	4: 47,
	5: 167,
	6: 335,
	7: 719,
	8: 2879,
};

export type ForecastAssignment = {
	srs_stage: number;
	available_at: string | null;
	hidden?: boolean;
};

export type ForecastDay = {
	date: Date;
	/** reviews from what's already scheduled */
	base: number;
	/** reviews with the new lessons too */
	total: number;
	/** Apprentice subjects at the end of the day (with the new lessons) */
	apprentice: number;
};

function simulate(
	assignments: ForecastAssignment[],
	{ days, lessonsPerDay, accuracy, now }: { days: number; lessonsPerDay: number; accuracy: number; now: number },
) {
	const start = Math.floor(now / HOUR_MS) * HOUR_MS;
	const today = new Date(now).setHours(0, 0, 0, 0);
	// the last forecast day's end (local time), in hours from the start
	const hours = Math.ceil((today + days * DAY_MS - start) / HOUR_MS);
	// due[h * 10 + stage]: how much is due at that hour, at that stage (0: a lesson)
	const due = new Float64Array(hours * 10);
	const count = new Float64Array(10);
	const schedule = (hour: number, stage: number, weight: number) => {
		if (hour < hours && weight > 0) due[hour * 10 + stage] += weight;
	};

	for (const assignment of assignments) {
		const stage = assignment.srs_stage;
		if (assignment.hidden || !(stage >= 1 && stage <= 8)) continue;
		count[stage] += 1;
		const at = assignment.available_at ? Date.parse(assignment.available_at) : NaN;
		// due already: done now
		const hour = Number.isFinite(at) ? Math.max(0, Math.floor((at - start) / HOUR_MS)) : 0;
		schedule(hour, stage, 1);
	}

	// the lessons: now, then at the same time each following day
	for (let day = 0; day < days; day++) schedule(day * 24, 0, lessonsPerDay);

	const reviews = new Float64Array(days);
	const apprentice = new Float64Array(days);
	const dayOf = (hour: number) => Math.floor((start + hour * HOUR_MS - today) / DAY_MS);

	for (let hour = 0; hour < hours; hour++) {
		const day = dayOf(hour);
		for (let stage = 0; stage <= 8; stage++) {
			const weight = due[hour * 10 + stage];
			if (!weight) continue;
			if (stage === 0) {
				count[1] += weight;
				schedule(hour + INTERVAL_HOURS[1], 1, weight);
				continue;
			}
			if (day >= 0 && day < days) reviews[day] += weight;
			count[stage] -= weight;
			const up = stage + 1;
			const right = weight * accuracy;
			// burned: no more reviews
			if (up <= 8) {
				count[up] += right;
				schedule(hour + INTERVAL_HOURS[up], up, right);
			}
			const down = Math.max(1, stage - (stage >= 5 ? 2 : 1));
			count[down] += weight - right;
			schedule(hour + INTERVAL_HOURS[down], down, weight - right);
		}
		// the day's last hour: how many are in Apprentice
		if (day >= 0 && day < days && dayOf(hour + 1) !== day) {
			apprentice[day] = count[1] + count[2] + count[3] + count[4];
		}
	}
	return { reviews, apprentice };
}

export function forecastWorkload(
	assignments: ForecastAssignment[],
	{ days = 14, lessonsPerDay = 0, accuracy = 0.85, now = Date.now() } = {},
): ForecastDay[] {
	const base = simulate(assignments, { days, lessonsPerDay: 0, accuracy, now });
	const withLessons = lessonsPerDay
		? simulate(assignments, { days, lessonsPerDay, accuracy, now })
		: base;
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	return Array.from({ length: days }, (_, day) => {
		const date = new Date(today);
		date.setDate(date.getDate() + day);
		return {
			date,
			base: Math.round(base.reviews[day]),
			total: Math.round(withLessons.reviews[day]),
			apprentice: Math.round(withLessons.apprentice[day]),
		};
	});
}

/** Apprentice subjects right now. */
export function apprenticeCount(assignments: ForecastAssignment[]): number {
	return assignments.filter(assignment => !assignment.hidden && assignment.srs_stage >= 1 && assignment.srs_stage <= 4).length;
}

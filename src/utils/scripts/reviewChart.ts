export type ChartDatasetKey = 'apprentice' | 'guru' | 'master' | 'enlightened';

export const CHART_SRS_GROUPS: Record<ChartDatasetKey, number[]> = {
	apprentice: [1, 2, 3, 4],
	guru: [5, 6],
	master: [7],
	enlightened: [8],
};

export const CHART_GROUP_LABELS: Record<ChartDatasetKey, string> = {
	apprentice: 'Apprentice',
	guru: 'Guru',
	master: 'Master',
	enlightened: 'Enlightened',
};

export const CHART_GROUP_COLORS: Record<ChartDatasetKey, string> = {
	apprentice: '#dd0093',
	guru: '#882d9e',
	master: '#294ddb',
	enlightened: '#0093dd',
};

export const CHART_DATASET_ORDER: ChartDatasetKey[] = ['apprentice', 'guru', 'master', 'enlightened'];

export type ReviewAssignment = {
	subject_id: number;
	subject_type: string;
	srs_stage: number;
	available_at: string;
	hidden?: boolean;
};

export function getFutureReviewAssignments(
	assignments: ReviewAssignment[],
	maxDaysAhead = 14,
): ReviewAssignment[] {
	const now = Date.now();
	const end = now + maxDaysAhead * 24 * 60 * 60 * 1000;

	return assignments.filter(assignment => {
		if (assignment.hidden || assignment.srs_stage <= 0) return false;
		const availableAt = new Date(assignment.available_at).getTime();
		return availableAt > now && availableAt <= end;
	});
}

export function getReviewsWithinHours(
	assignments: ReviewAssignment[],
	from: Date,
	hours: number,
): ReviewAssignment[] {
	const start = from.getTime();
	const end = start + hours * 60 * 60 * 1000;

	return assignments.filter(assignment => {
		const availableAt = new Date(assignment.available_at).getTime();
		return availableAt >= start && availableAt < end;
	});
}

export function getReviewsOnDay(
	assignments: ReviewAssignment[],
	day: Date,
): ReviewAssignment[] {
	const start = startOfDay(day);
	const end = new Date(start);
	end.setDate(end.getDate() + 1);

	return assignments.filter(assignment => {
		const availableAt = new Date(assignment.available_at);
		return availableAt >= start && availableAt < end;
	});
}

export function getReviewsInHourSlot(
	assignments: ReviewAssignment[],
	slotStart: Date,
): ReviewAssignment[] {
	const slotEnd = new Date(slotStart);
	slotEnd.setHours(slotEnd.getHours() + 1);

	return assignments.filter(assignment => {
		const availableAt = new Date(assignment.available_at);
		return availableAt >= slotStart && availableAt < slotEnd;
	});
}

export function startOfDay(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

export function toDateInputValue(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value: string): Date {
	const [year, month, day] = value.split('-').map(Number);
	return new Date(year, month - 1, day);
}

export function formatDayHeading(date: Date): string {
	return date.toLocaleDateString(undefined, {
		weekday: 'short',
		month: 'long',
		day: 'numeric',
	});
}

export function formatHourLabel(date: Date, use12h = false): string {
	return date.toLocaleTimeString(undefined, {
		hour: 'numeric',
		hour12: use12h,
	});
}

export function formatDateTime(date: Date): string {
	return date.toLocaleString(undefined, {
		weekday: 'short',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

export type HourlyChartData = {
	labels: string[];
	datasets: Record<ChartDatasetKey, number[]>;
	slots: Date[];
	total: number;
};

/** Build stacked hourly buckets for a time window. */
export function buildHourlyChartData(
	assignments: ReviewAssignment[],
	rangeStart: Date,
	slotCount: number,
	use12h = false,
): HourlyChartData {
	const slots: Date[] = [];
	const labels: string[] = [];

	for (let i = 0; i < slotCount; i++) {
		const slot = new Date(rangeStart);
		slot.setHours(slot.getHours() + i, 0, 0, 0);
		slots.push(slot);
		labels.push(formatHourLabel(slot, use12h));
	}

	const datasets = Object.fromEntries(
		CHART_DATASET_ORDER.map(key => [key, [] as number[]]),
	) as Record<ChartDatasetKey, number[]>;

	for (const slot of slots) {
		const slotAssignments = getReviewsInHourSlot(assignments, slot);
		for (const key of CHART_DATASET_ORDER) {
			const stages = CHART_SRS_GROUPS[key];
			datasets[key].push(
				slotAssignments.filter(a => stages.includes(a.srs_stage)).length,
			);
		}
	}

	const total = CHART_DATASET_ORDER.reduce(
		(sum, key) => sum + datasets[key].reduce((a, b) => a + b, 0),
		0,
	);

	return { labels, datasets, slots, total };
}

export function buildNext24HourChart(
	assignments: ReviewAssignment[],
	use12h = false,
): HourlyChartData {
	const now = new Date();
	now.setMinutes(0, 0, 0);
	return buildHourlyChartData(assignments, now, 24, use12h);
}

export function buildDayChart(
	assignments: ReviewAssignment[],
	day: Date,
	use12h = false,
): HourlyChartData {
	return buildHourlyChartData(assignments, startOfDay(day), 24, use12h);
}

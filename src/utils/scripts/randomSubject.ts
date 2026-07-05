import { randomSubjectOptions } from '@/utils/scripts/defaultSettings';
import { fontColorFromBackground } from '@/utils/scripts/profileSubjects';
import { typeColors } from '@/utils/scripts/wanikani';

export type RandomSubjectMode = typeof randomSubjectOptions[number];

type RandomContext = {
	allSubjects: Array<any>;
	assignments: Array<any>;
	summary: {
		lessons: Array<{ subject_id: number }>;
		reviews: Array<{ subject_id: number }>;
	};
};

type SubjectWithAssignment = {
	id: number;
	type?: string;
	subject_type?: string;
	characters?: string;
	assignment?: {
		srs_stage?: number | null;
		hidden?: boolean;
	};
};

function visibleAssignments(assignments: Array<any>) {
	return assignments.filter(assignment => !assignment.hidden);
}

function mergeAssignment(
	subject: SubjectWithAssignment,
	assignmentById: Map<number, any>,
) {
	const fromSubject = subject.assignment;
	const fromStore = assignmentById.get(subject.id);

	if (!fromSubject && !fromStore) return undefined;

	return {
		...fromSubject,
		...fromStore,
	};
}

function mergeSubjectsWithAssignments(context: RandomContext): SubjectWithAssignment[] {
	const assignmentById = new Map(context.assignments.map(assignment => [assignment.subject_id, assignment]));
	const subjectById = new Map<number, SubjectWithAssignment>();

	for (const subject of context.allSubjects) {
		subjectById.set(subject.id, {
			...subject,
			type: subject.type || subject.subject_type,
			assignment: mergeAssignment(subject, assignmentById),
		});
	}

	// Include assignment-only subjects so random pools are not limited to cached materials
	// (e.g. when allSubjects only has the latest synced level in memory).
	for (const assignment of visibleAssignments(context.assignments)) {
		if (subjectById.has(assignment.subject_id)) continue;

		subjectById.set(assignment.subject_id, {
			id: assignment.subject_id,
			type: assignment.subject_type,
			subject_type: assignment.subject_type,
			assignment,
		});
	}

	return [...subjectById.values()];
}

function subjectType(subject: SubjectWithAssignment) {
	return subject.type || subject.subject_type;
}

function isVisible(subject: SubjectWithAssignment) {
	return !subject.assignment?.hidden;
}

function subjectSrsStage(
	subject: SubjectWithAssignment,
	assignmentById: Map<number, any>,
) {
	const assignment = assignmentById.get(subject.id) ?? subject.assignment;
	const stage = assignment?.srs_stage;
	if (stage == null) return null;
	return Number(stage);
}

/** Matches v1.5 learned subjects: SRS stage above Apprentice I. */
function isSubjectLearned(
	subject: SubjectWithAssignment,
	assignmentById: Map<number, any>,
) {
	const stage = subjectSrsStage(subject, assignmentById);
	return stage != null && stage > 0;
}

function isSubjectNotLearned(
	subject: SubjectWithAssignment,
	assignmentById: Map<number, any>,
) {
	return !isSubjectLearned(subject, assignmentById);
}

function idsMatching(
	context: RandomContext,
	predicate: (subject: SubjectWithAssignment, assignmentById: Map<number, any>) => boolean,
) {
	const assignmentById = new Map(context.assignments.map(assignment => [assignment.subject_id, assignment]));
	const ids = mergeSubjectsWithAssignments(context)
		.filter(subject => isVisible(subject) && predicate(subject, assignmentById))
		.map(subject => subject.id);

	return [...new Set(ids)];
}

function queueSubjectIds(
	context: RandomContext,
	queue: Array<{ subject_id: number }> | undefined,
) {
	if (!queue?.length) return [];

	const hiddenIds = new Set(
		context.assignments
			.filter(assignment => assignment.hidden)
			.map(assignment => assignment.subject_id),
	);

	return [...new Set(queue.map(entry => entry.subject_id).filter(id => !hiddenIds.has(id)))];
}

export function pickRandomSubjectId(
	mode: RandomSubjectMode,
	context: RandomContext,
): number | null {
	let ids: number[] = [];

	switch (mode) {
		case 'Any':
			ids = idsMatching(context, () => true);
			break;
		case 'Radicals':
			ids = idsMatching(context, subject => subjectType(subject) === 'radical');
			break;
		case 'Kanji':
			ids = idsMatching(context, subject => subjectType(subject) === 'kanji');
			break;
		case 'Vocabulary':
			ids = idsMatching(context, subject => {
				const type = subjectType(subject);
				return type === 'vocabulary' || type === 'kana_vocabulary';
			});
			break;
		case 'Learned':
			ids = idsMatching(context, (subject, assignmentById) =>
				isSubjectLearned(subject, assignmentById),
			);
			break;
		case 'Not Learned':
			ids = idsMatching(context, (subject, assignmentById) =>
				isSubjectNotLearned(subject, assignmentById),
			);
			break;
		case 'Lessons':
			ids = queueSubjectIds(context, context.summary.lessons);
			break;
		case 'Reviews':
			ids = queueSubjectIds(context, context.summary.reviews);
			break;
		default:
			break;
	}

	if (!ids.length) return null;
	return ids[Math.floor(Math.random() * ids.length)];
}

export function getRandomSubjectBadge(
	mode: RandomSubjectMode,
	appearance: Record<string, string>,
) {
	let backgroundColor = '#668b8b';

	switch (mode) {
		case 'Radicals':
			backgroundColor = appearance.radical_color || typeColors.radical;
			break;
		case 'Kanji':
			backgroundColor = appearance.kanji_color || typeColors.kanji;
			break;
		case 'Vocabulary':
			backgroundColor = appearance.vocab_color || typeColors.vocabulary;
			break;
		case 'Learned':
			backgroundColor = appearance.highlight_learned;
			break;
		case 'Not Learned':
			backgroundColor = appearance.highlight_not_learned;
			break;
		case 'Lessons':
			backgroundColor = '#f100a1';
			break;
		case 'Reviews':
			backgroundColor = '#00aaff';
			break;
		default:
			break;
	}

	return {
		label: mode.charAt(0),
		backgroundColor,
		color: fontColorFromBackground(backgroundColor),
	};
}

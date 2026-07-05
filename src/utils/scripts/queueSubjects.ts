import { groupByType, SRS_STAGE_IDS } from '@/utils/scripts/common';
import { srsStages, typeColors } from '@/utils/scripts/wanikani';

export type QueueSubjectItem = {
	id: number;
	type?: string;
	subject_type?: string;
	characters?: string;
	character_images?: Array<{ content_type: string; url: string }>;
	level?: number;
	assignment?: {
		srs_stage?: number;
		passed_at?: string | null;
		hidden?: boolean;
	};
};

export type QueueSection = {
	id: string;
	label: string;
	color: string;
	items: QueueSubjectItem[];
};

/** Build display items for a summary queue (lessons / available reviews). */
export function buildQueueSubjectItems(
	subjectIds: Iterable<number>,
	assignments: Array<any> = [],
	allSubjects: Array<any> = [],
): QueueSubjectItem[] {
	const assignmentBySubjectId = new Map(assignments.map(a => [a.subject_id, a]));
	const subjectById = new Map(allSubjects.map(s => [s.id, s]));
	const items: QueueSubjectItem[] = [];

	for (const subjectId of subjectIds) {
		const assignment = assignmentBySubjectId.get(subjectId);
		if (!assignment || assignment.hidden) continue;

		const subject = subjectById.get(subjectId);
		if (subject) {
			items.push({
				...subject,
				type: subject.type || assignment.subject_type,
				subject_type: subject.subject_type || assignment.subject_type,
				assignment: {
					srs_stage: assignment.srs_stage,
					passed_at: assignment.passed_at,
					hidden: assignment.hidden,
				},
			});
			continue;
		}

		items.push({
			id: subjectId,
			type: assignment.subject_type,
			subject_type: assignment.subject_type,
			assignment: {
				srs_stage: assignment.srs_stage,
				passed_at: assignment.passed_at,
				hidden: assignment.hidden,
			},
		});
	}

	return items;
}

/** Group available reviews by SRS stage (Apprentice → Enlightened). */
export function groupReviewQueueSections(items: QueueSubjectItem[]): QueueSection[] {
	return SRS_STAGE_IDS
		.filter(stage => stage > 0 && stage < 9)
		.map(stage => ({
			id: String(stage),
			label: srsStages[stage as keyof typeof srsStages].name,
			color: srsStages[stage as keyof typeof srsStages].color,
			items: items.filter(item => item.assignment?.srs_stage === stage),
		}))
		.filter(section => section.items.length > 0);
}

/** Group lessons by subject type (Radical → Kanji → Vocabulary). */
export function groupLessonQueueSections(items: QueueSubjectItem[]): QueueSection[] {
	return groupByType(items.map(item => ({
		...item,
		subject_type: item.type || item.subject_type,
	})) as Array<{ id: string; items: QueueSubjectItem[] }>).map(group => ({
		id: group.id,
		label: group.id.charAt(0).toUpperCase() + group.id.slice(1),
		color: typeColors[group.id as keyof typeof typeColors] || typeColors.vocabulary,
		items: group.items,
	}));
}

/** Colors map so every tile in a section uses the section accent color. */
export function sectionTileColors(sectionColor: string) {
	return {
		radical: sectionColor,
		kanji: sectionColor,
		vocabulary: sectionColor,
		kana_vocabulary: sectionColor,
	};
}

export function buildBarValues(sections: QueueSection[]) {
	return sections.map(section => ({ id: section.id, items: section.items }));
}

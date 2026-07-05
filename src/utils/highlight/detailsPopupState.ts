import { reactive } from 'vue';
import { DEFAULT_HIGHLIGHT_STYLE_VARS, type HighlightStyleVars } from './highlightStyleVars';
import type { SubjectHistoryEntry } from '@/utils/scripts/subjectDetailsPopup';
import { ensureFullSubjectForPopup } from './detailsPopupSubject';

/**
 * Shared reactive state + show/hide logic for the in-page kanji/word details
 * popup. Kept separate from both the content-script controller and the Vue
 * component so they can share it without a circular import.
 */
export const popupState = reactive({
	item: null as any,
	relatedSubjects: {} as Record<number, any>,
	history: [] as SubjectHistoryEntry[],
	visible: false,
	focused: false,
	hovering: false,
	locked: false,
	fixed: false,
	keyBindings: true,
	opacity: 0.9,
	width: 300,
	showStrokes: true,
	autoplayAudio: false,
	highlightStyleVars: { ...DEFAULT_HIGHLIGHT_STYLE_VARS } as HighlightStyleVars,
	srsAppearanceVars: {} as Record<string, string>,
});

export function showSubjectBundle(
	subject: any,
	related: Record<number, any> = {},
	options: { pushHistory?: boolean } = {},
): void {
	if (!subject) return;

	const pushHistory = options.pushHistory !== false;
	const entry: SubjectHistoryEntry = {
		id: subject.id,
		characters: subject.characters,
		type: subject.type ?? subject.subject_type,
	};

	if (pushHistory) {
		const last = popupState.history[popupState.history.length - 1];
		if (!last || last.id !== entry.id) {
			popupState.history.push(entry);
		}
	}

	popupState.item = subject;
	popupState.relatedSubjects = related;
	popupState.visible = true;
}

export function showSubject(subject: any): void {
	showSubjectBundle(subject, popupState.relatedSubjects);
}

export function hidePopup(): void {
	if (popupState.fixed) return;

	popupState.visible = false;
	popupState.focused = false;
	popupState.hovering = false;
	popupState.locked = false;
	popupState.history = [];
	popupState.relatedSubjects = {};
}

function onPopupExpanded(): void {
	void ensureFullSubjectForPopup();
}

export function setFocused(value: boolean): void {
	const wasFocused = popupState.focused;
	popupState.focused = value;
	if (value && !wasFocused) onPopupExpanded();
}

export function setHovering(value: boolean): void {
	popupState.hovering = value;
	if (!value) return;

	const wasFocused = popupState.focused;
	popupState.focused = true;
	if (!wasFocused) onPopupExpanded();
}

export function toggleLocked(): void {
	popupState.locked = !popupState.locked;
}

export function toggleFixed(): void {
	popupState.fixed = !popupState.fixed;
}

export function canNavigateBack(): boolean {
	return popupState.history.length > 1;
}

export function popHistoryEntry(): SubjectHistoryEntry | null {
	if (popupState.history.length <= 1) return null;
	popupState.history.pop();
	return popupState.history[popupState.history.length - 1] ?? null;
}

export async function copySubjectCharacters(subject?: any): Promise<void> {
	const text = subject?.characters;
	if (!text || !navigator.clipboard?.writeText) return;
	await navigator.clipboard.writeText(text);
}

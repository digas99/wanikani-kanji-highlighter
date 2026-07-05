import {
	canNavigateBack,
	copySubjectCharacters,
	hidePopup,
	popupState,
	setFocused,
	toggleFixed,
	toggleLocked,
} from './detailsPopupState';
import { navigatePopupHistoryBack } from './detailsPopupSubject';

function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function handleDetailsPopupKeydown(event: KeyboardEvent): void {
	if (!popupState.visible || !popupState.keyBindings || isTypingTarget(event.target)) return;

	const key = event.key;

	if (key === 'x' || key === 'X') {
		event.preventDefault();
		hidePopup();
		return;
	}

	if (key === 'l' || key === 'L') {
		event.preventDefault();
		toggleLocked();
		return;
	}

	if (popupState.focused) {
		if (key === 'f' || key === 'F') {
			event.preventDefault();
			toggleFixed();
			return;
		}

		if (key === 'b' || key === 'B') {
			event.preventDefault();
			if (canNavigateBack()) void navigatePopupHistoryBack();
			return;
		}

		if (key === 'u' || key === 'U') {
			event.preventDefault();
			document.dispatchEvent(new CustomEvent('wkh:details-scroll-top'));
			return;
		}

		if (key === 'y' || key === 'Y') {
			event.preventDefault();
			void copySubjectCharacters(popupState.item);
			return;
		}

		if (key === 'i' || key === 'I') {
			event.preventDefault();
			document.dispatchEvent(new CustomEvent('wkh:details-scroll-section', { detail: 'Info' }));
			return;
		}

		if (key === 'c' || key === 'C') {
			event.preventDefault();
			document.dispatchEvent(new CustomEvent('wkh:details-scroll-section', { detail: 'Cards' }));
			return;
		}

		if (key === 's' || key === 'S') {
			event.preventDefault();
			document.dispatchEvent(new CustomEvent('wkh:details-scroll-section', { detail: 'Statistics' }));
			return;
		}

		if (key === 't' || key === 'T') {
			event.preventDefault();
			document.dispatchEvent(new CustomEvent('wkh:details-scroll-section', { detail: 'Timestamps' }));
			return;
		}

		if (key === 'ArrowRight' || key === 'ArrowLeft') {
			event.preventDefault();
			document.dispatchEvent(new CustomEvent('wkh:details-nav-section', { detail: key }));
			return;
		}
	} else if (key === 'o' || key === 'O') {
		event.preventDefault();
		setFocused(true);
	}
}

export function handleDetailsPopupKeyup(event: KeyboardEvent): void {
	if (!popupState.visible || !popupState.keyBindings) return;
	// Reserved for future chord bindings.
	void event;
}

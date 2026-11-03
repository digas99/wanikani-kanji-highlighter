/**
 * A CSS selector for an element chosen on a page, meant to find "the same part" on the site's
 * other pages (an article's body, say): ids and class names, never positions (nth-child),
 * and none of the names that look generated or depend on state.
 */

const MAX_DEPTH = 4;
/** generated (css-1x9f2), stateful (is-active), or too specific to repeat on other pages */
const UNSTABLE = /\d{3,}|^(css|sc|jsx|emotion|svelte)-|[_-][a-z0-9]{6,}$|^(is|has)-|active|selected|hover|focus|open|visible|hidden|show/i;

function stableId(element: Element): string | null {
	const id = element.id;
	if (!id || id.length > 40 || UNSTABLE.test(id)) return null;
	return `#${CSS.escape(id)}`;
}

function segment(element: Element): string {
	const classes = Array.from(element.classList)
		.filter(name => name.length <= 30 && !UNSTABLE.test(name) && !name.startsWith('wkh'))
		.slice(0, 2)
		.map(name => `.${CSS.escape(name)}`)
		.join('');
	return `${element.tagName.toLowerCase()}${classes}`;
}

function matches(selector: string, element: Element): number {
	try {
		const found = Array.from(document.querySelectorAll(selector));
		return found.includes(element) ? found.length : 0;
	} catch {
		return 0;
	}
}

/** The shortest selector, from the element up, that finds it (and few others). */
export function selectorFor(element: Element): string {
	const id = stableId(element);
	if (id && matches(id, element) === 1) return id;

	let path = segment(element);
	let current = element.parentElement;
	for (let depth = 0; depth < MAX_DEPTH; depth++) {
		const count = matches(path, element);
		// specific enough: this element, or a handful like it (e.g. each post of a thread)
		if (count && count <= 5 && path.includes('.')) return path;
		if (!current || current === document.body || current === document.documentElement) break;
		const parentId = stableId(current);
		if (parentId) {
			const withId = `${parentId} ${path}`;
			if (matches(withId, element)) return withId;
		}
		path = `${segment(current)} > ${path}`;
		current = current.parentElement;
	}
	return path;
}

/** The elements a site's chosen parts match on this page (none nested in another). */
export function elementsFor(selectors: string[]): Element[] {
	const found = new Set<Element>();
	for (const selector of selectors) {
		try {
			document.querySelectorAll(selector).forEach(element => found.add(element));
		} catch {
			/* a selector the page can't use anymore */
		}
	}
	const all = Array.from(found);
	return all.filter(element => !all.some(other => other !== element && other.contains(element)));
}

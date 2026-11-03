/**
 * WaniKani's settings page, its Avatars section: the avatar chosen there goes to the extension
 * right away (else it only notices on its daily check of the profile page). A Yes / No row in
 * that section turns it off (Yes by default; kept in the extension's storage).
 *
 * WaniKani saves the choice and then reloads the section (its turbo-frame #avatar_frame) with the
 * new one marked data-selected="true": that's when it's sent, so a choice that wasn't saved isn't.
 * Only for the account the extension is logged in with (the page's username is checked).
 */

import { storage } from '#imports';

const ENABLED_KEY = 'local:avatarSync';
const ROW_ID = 'wkh-avatar-sync';
/** quiet this long after the section changed: WaniKani's save and its reload are done */
const SETTLE_MS = 1200;

let observer: MutationObserver | null = null;
/** the avatar selected when last looked at (a change is a new choice) */
let known: string | null = null;
let enabled = true;

const frame = () => document.getElementById('avatar_frame');
const selectedUrl = () => frame()?.querySelector('.avatar-selection__avatar[data-selected="true"]')?.getAttribute('data-avatar-url') ?? null;
const pageUsername = () => document.querySelector('.user-summary__username')?.textContent?.trim() ?? '';

const DESCRIPTION = 'When you choose an avatar here, the extension uses it too.';

/** Under the row's label (in place of its description while there's something to say). */
function setStatus(text: string, tone: 'ok' | 'note' | '' = '') {
	const status = document.querySelector<HTMLElement>(`#${ROW_ID} .wkh-avatar-sync__status`);
	if (!status) return;
	status.textContent = text || DESCRIPTION;
	status.style.color = tone === 'ok' ? '#2f8f5b' : tone === 'note' ? '#b26a00' : '';
}

/**
 * A row as WaniKani's own settings (label and description on the left, a select on the right:
 * its wk-form classes), the extension's icon by the label so it's clearly the extension's.
 */
function injectRow() {
	const target = frame();
	if (!target || document.getElementById(ROW_ID)) return;
	const row = document.createElement('div');
	row.id = ROW_ID;
	// a wk-form (not a <form>: nothing is sent to WaniKani) for WaniKani's form styles
	row.className = 'wk-form';
	row.style.marginBottom = '16px';
	const icon = browser.runtime.getURL('/icon/32.png');
	row.innerHTML = `
		<div class="wk-form__field wk-form__field--inline" style="flex-wrap:nowrap;align-items:center;gap:16px">
			<div class="wk-form__label_and_description" style="flex:1 1 auto;min-width:0">
				<label class="wk-form__label" for="${ROW_ID}-select" style="display:inline-flex;align-items:center;gap:8px">
					<img src="${icon}" alt="" width="20" height="20" style="width:20px;height:20px;border-radius:4px;flex-shrink:0">
					Update WK Highlighter's picture
				</label>
				<aside class="wk-form__label-description"><p class="wk-text wkh-avatar-sync__status"></p></aside>
			</div>
			<!-- on the same line as the label, whatever the panel's width (WaniKani's wraps it under) -->
			<div class="wk-form__control" style="flex:0 0 auto;margin:0">

				<select class="wk-form__select" id="${ROW_ID}-select">
					<option value="yes">Yes</option>
					<option value="no">No</option>
				</select>
			</div>
		</div>`;
	const select = row.querySelector('select')!;
	select.value = enabled ? 'yes' : 'no';
	select.addEventListener('change', () => {
		enabled = select.value === 'yes';
		void storage.setItem(ENABLED_KEY, enabled);
		setStatus('');
	});
	// outside the frame: WaniKani replaces the frame's content on each save
	target.before(row);
	setStatus('');
}

async function send(url: string) {
	setStatus('Sending to WK Highlighter…');
	let result: any = null;
	try {
		result = await browser.runtime.sendMessage({ type: 'wkh:avatarChosen', url, username: pageUsername() });
	} catch {
		result = null;
	}
	if (result?.ok) setStatus('WK Highlighter has it ✓', 'ok');
	else if (result?.reason === 'other-account') setStatus(`WK Highlighter is logged in as ${result.account}: not changed there`, 'note');
	else if (result?.reason === 'logged-out') setStatus('WK Highlighter isn\'t logged in', 'note');
	else setStatus('Couldn\'t send it to WK Highlighter', 'note');
}

/** The section was saved and shown again: a new avatar is sent (when Yes). */
function check() {
	injectRow();
	const url = selectedUrl();
	if (!url || url === known) return;
	const first = known === null;
	known = url;
	if (!first && enabled) void send(url);
}

function watchPage() {
	observer?.disconnect();
	observer = null;
	known = null;
	if (location.hostname !== 'www.wanikani.com' || !frame()) return;
	check();
	// a click marks the avatar before it's saved: looked at once the section has settled
	let settle: number | null = null;
	observer = new MutationObserver(() => {
		if (settle != null) clearTimeout(settle);
		settle = window.setTimeout(check, SETTLE_MS);
	});
	observer.observe(frame()!, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-selected'] });
}

export async function watchAvatarChoice(): Promise<void> {
	if (location.hostname !== 'www.wanikani.com') return;
	enabled = (await storage.getItem<boolean>(ENABLED_KEY)) !== false;
	watchPage();
	// WaniKani changes pages without reloading (Turbo)
	document.addEventListener('turbo:load', () => watchPage());
	window.addEventListener('popstate', () => watchPage());
}

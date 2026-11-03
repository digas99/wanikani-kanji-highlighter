/**
 * The extension's browser notifications (new reviews, the daily reminder, a search or an API key
 * waiting in the popup): the same look, and silent. Chromium plays the system's sound unless told
 * not to; Firefox has no such option (and refuses the notification when it's given).
 */
export async function showBrowserNotification(id: string, title: string, message: string): Promise<void> {
	const options = {
		type: 'basic' as const,
		iconUrl: browser.runtime.getURL('/icon/128.png'),
		title,
		message,
		...(import.meta.env.FIREFOX ? {} : { silent: true }),
	};
	await browser.notifications.create(id, options);
}

const WK_API_USER_URL = 'https://api.wanikani.com/v2/user';
const WK_API_REVISION = '20170710';

const API_KEY_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ApiKeyValidationResult =
	| { ok: true; username: string }
	| { ok: false; error: string };

export function normalizeApiKey(raw: string): string {
	return raw.trim();
}

export function getApiKeyFormatError(apiKey: string): string | null {
	if (!apiKey) return 'Enter your WaniKani API key.';
	if (/\s/.test(apiKey)) return 'API key must not contain spaces.';
	if (apiKey.length !== 36) {
		return 'API key should be a 36-character UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).';
	}
	if (!API_KEY_UUID_PATTERN.test(apiKey)) {
		return 'API key format is invalid. Copy it from WaniKani personal access tokens.';
	}
	return null;
}

export async function verifyApiKeyWithRequest(apiKey: string): Promise<ApiKeyValidationResult> {
	const normalized = normalizeApiKey(apiKey);
	const formatError = getApiKeyFormatError(normalized);
	if (formatError) return { ok: false, error: formatError };

	try {
		const response = await fetch(WK_API_USER_URL, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${normalized}`,
				'Wanikani-Revision': WK_API_REVISION,
			},
		});

		if (response.status === 401 || response.status === 403) {
			return { ok: false, error: 'Invalid API key. Check your key and try again.' };
		}

		if (!response.ok) {
			let message = `WaniKani request failed (${response.status}).`;
			try {
				const body = await response.json();
				if (body?.error) message = String(body.error);
			} catch {
				/* ignore parse errors */
			}
			return { ok: false, error: message };
		}

		const body = await response.json();
		const username = body?.data?.username;
		if (!username) {
			return { ok: false, error: 'Unexpected response from WaniKani.' };
		}

		return { ok: true, username: String(username) };
	} catch {
		return {
			ok: false,
			error: 'Could not reach WaniKani. Check your connection and try again.',
		};
	}
}

export async function validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
	return verifyApiKeyWithRequest(apiKey);
}

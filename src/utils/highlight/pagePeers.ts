/**
 * This extension on the page, for the other highlighters there (cjk-highlighter's coexistence):
 * a Chinese one (HanziHero Companion) that shares the page takes its Chinese text. Said while
 * the highlight runs here (runtime.ts), so a page it doesn't run on isn't left to it.
 */

import { PagePeers, type PeerInfo } from 'cjk-highlighter';

let peers: PagePeers | null = null;

export function wkPeers(): PagePeers {
	peers ??= new PagePeers({
		id: 'wkh',
		name: 'WaniKani Kanji Highlighter',
		role: 'japanese',
		share: true,
		choices: { japanese: 'highlight', chinese: 'highlight', unclear: 'highlight' },
	});
	return peers;
}

/** The partner's part in the rules, compared to know when they change. */
export function partnerKey(partner: PeerInfo | null): string {
	return partner ? `${partner.id}:${JSON.stringify(partner.choices)}` : '';
}

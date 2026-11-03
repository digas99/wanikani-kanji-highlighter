<template>
	<div class="whats-new" :class="{ compact }">
		<!-- the biggest changes first, large, each with a small picture -->
		<section class="whats-new-section" :style="{ '--section-color': '#f100a1' }">
			<h2 class="whats-new-section-title">
				<span>Highlights</span>
				<span class="whats-new-rule" aria-hidden="true"></span>
			</h2>
			<div class="whats-new-highlights">
				<component
					:is="item.to && links ? (linkBase ? 'a' : 'RouterLink') : 'div'"
					v-for="item in highlights"
					:key="item.id"
					class="whats-new-highlight"
					:class="{ linked: item.to && links }"
					:style="{ '--section-color': item.color }"
					v-bind="linkProps(item)"
				>
					<span class="whats-new-art" aria-hidden="true">
						<!-- a conjugated word, found as the word you study -->
						<span v-if="item.id === 'words'" class="art-words" lang="ja">
							<span class="art-line">彼と<mark>話して</mark>いました</span>
							<span class="art-base">→ 話す</span>
						</span>
						<!-- YouTube and the browser's translator -->
						<span v-else-if="item.id === 'pages'" class="art-pages">
							<svg class="art-youtube" viewBox="0 0 28 20"><rect width="28" height="20" rx="5" fill="#ff0000" /><path d="M11 5.5v9l8-4.5z" fill="#fff" /></svg>
							<span class="art-plus">+</span>
							<span class="art-translate" lang="ja"><span>文</span><b>A</b></span>
						</span>
						<!-- a sentence from a page, its kanji highlighted, translated -->
						<span v-else-if="item.id === 'sentences'" class="art-sentence">
							<span class="art-line" lang="ja">「<mark>雨</mark>が降っています。」</span>
							<span class="art-english">It's raining.</span>
						</span>
						<!-- a subject in the summary: its SRS change, passed -->
						<span v-else class="art-summary">
							<span class="art-chip">
								<span class="art-chip-chars" lang="ja">災</span>
								<span class="art-chip-stages"><b style="background: #dd0093">Ap4</b>→<b style="background: #894e97">Gr1</b></span>
								<span class="art-check">✓</span>
							</span>
							<span class="art-up">↑ went up</span>
						</span>
					</span>
					<span class="whats-new-body">
						<b>{{ item.title }}</b>
						<span class="whats-new-text">{{ item.text }}</span>
						<span v-if="item.to && links" class="whats-new-action">{{ item.action || 'Open' }} ›</span>
					</span>
				</component>
			</div>
		</section>

		<section v-for="section in sections" :key="section.id" class="whats-new-section" :style="{ '--section-color': section.color }">
			<h2 class="whats-new-section-title">
				<span>{{ section.title }}</span>
				<span class="whats-new-rule" aria-hidden="true"></span>
			</h2>
			<div class="whats-new-grid">
				<component
					:is="item.to && links ? (linkBase ? 'a' : 'RouterLink') : 'div'"
					v-for="item in section.items"
					:key="item.title"
					class="whats-new-card"
					:class="{ linked: item.to && links }"
					v-bind="linkProps(item)"
				>
					<span class="whats-new-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24"><path :d="icons[item.icon]" /></svg>
					</span>
					<span class="whats-new-body">
						<b>{{ item.title }}</b>
						<span class="whats-new-text">{{ item.text }}</span>
						<span v-if="item.to && links" class="whats-new-action">{{ item.action || 'Open' }} ›</span>
					</span>
				</component>
			</div>
		</section>

		<!-- the way back to a clean state, if the update left something broken (not for a first install) -->
		<section v-if="!fresh" class="whats-new-fix">
			<span class="whats-new-fix-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" /></svg>
			</span>
			<div>
				<h2>Something not right after the update?</h2>
				<p>
					If highlights look wrong, subjects don't load or numbers seem off, go to
					<b>Settings → Data</b> and use <b>Reset subject data</b>. It removes anything left over
					from the previous version and downloads your subjects from WaniKani again. Your
					settings, API key and saved history are kept, and your WaniKani account isn't affected.
				</p>
				<slot name="fix-action"></slot>
			</div>
		</section>
	</div>
</template>

<script>
import { WHATS_NEW, WHATS_NEW_HIGHLIGHTS, WHATS_NEW_ICONS } from '@/utils/scripts/whatsNew';

export default {
	name: 'WhatsNewList',

	props: {
		/** the popup's narrower layout */
		compact: { type: Boolean, default: false },
		/** outside the popup (the update's page): links open the popup's page in a new tab, from here */
		linkBase: { type: String, default: '' },
		/** cards link to their page in the popup (off on the update's page: not logged in there yet) */
		links: { type: Boolean, default: true },
		/** a first install (not an update): nothing was carried over, nothing to fix */
		fresh: { type: Boolean, default: false },
	},

	data() {
		return { highlights: WHATS_NEW_HIGHLIGHTS, icons: WHATS_NEW_ICONS };
	},

	computed: {
		sections() {
			if (!this.fresh) return WHATS_NEW;
			return WHATS_NEW.map(section => ({ ...section, items: section.items.filter(item => !item.updateOnly) }));
		},
	},

	methods: {
		linkProps(item) {
			if (!item.to || !this.links) return {};
			if (this.linkBase) return { href: `${this.linkBase}#${item.to}`, target: '_blank', rel: 'noopener' };
			return { to: item.to };
		},
	},
};
</script>

<style scoped>
.whats-new {
	display: flex;
	flex-direction: column;
	gap: 22px;
}

.whats-new-section-title {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 0 0 10px;
	font-size: 12px;
	font-weight: 800;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--section-color);
}

/* a rule after the title, in the section's color */
.whats-new-section-title .whats-new-rule {
	flex: 1;
	height: 2px;
	border-radius: 2px;
	background: linear-gradient(90deg, var(--section-color), transparent);
	opacity: 0.35;
}

.whats-new-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 8px;
}

.whats-new-card {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 12px 14px;
	border: 1px solid var(--surface-border-color, #e6e6ef);
	border-radius: 12px;
	background: var(--fill-color, #fff);
	color: inherit;
	text-decoration: none;
	transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
}

.whats-new-card.linked:hover {
	transform: translateY(-1px);
	border-color: var(--section-color);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.whats-new-icon {
	position: relative;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 10px;
	overflow: hidden;
}

/* the section's color, faint, behind the icon */
.whats-new-icon::before {
	content: '';
	position: absolute;
	inset: 0;
	background: var(--section-color);
	opacity: 0.14;
}

.whats-new-icon svg {
	position: relative;
	width: 20px;
	height: 20px;
	fill: none;
	stroke: var(--section-color);
	stroke-width: 1.9;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.whats-new-body {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.whats-new-body b {
	font-size: 14px;
	color: var(--heading-color, #2a2d48);
}

.whats-new-text {
	font-size: 13px;
	line-height: 1.45;
	color: var(--font-sec-color, #666);
}

.whats-new-action {
	margin-top: 3px;
	font-size: 12px;
	font-weight: 700;
	color: var(--section-color);
}

.whats-new-fix {
	display: flex;
	gap: 12px;
	padding: 14px 16px;
	border: 1px solid rgba(229, 72, 77, 0.35);
	border-radius: 12px;
	background: rgba(229, 72, 77, 0.07);
}

.whats-new-fix-icon {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 10px;
	background: #e5484d;
}

.whats-new-fix-icon svg {
	width: 20px;
	height: 20px;
	fill: none;
	stroke: #fff;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.whats-new-fix h2 {
	margin: 0 0 4px;
	font-size: 14px;
	color: #e5484d;
}

.whats-new-fix p {
	margin: 0;
	font-size: 13px;
	line-height: 1.5;
	color: var(--font-color, #343434);
}

.whats-new-fix b {
	color: var(--heading-color, #2a2d48);
}

/* the highlights: a grid of large tiles, a picture on top */
.whats-new-highlights {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
}

.whats-new-highlight {
	display: flex;
	flex-direction: column;
	border: 1px solid var(--surface-border-color, #e6e6ef);
	border-radius: 14px;
	background: var(--fill-color, #fff);
	color: inherit;
	text-decoration: none;
	overflow: hidden;
	transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
}

.whats-new-highlight.linked:hover {
	transform: translateY(-2px);
	border-color: var(--section-color);
	box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.whats-new-highlight .whats-new-body {
	padding: 10px 14px 14px;
}

/* the picture: on the tile's color, faint */
.whats-new-art {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 92px;
	overflow: hidden;
}

.whats-new-art::before {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(135deg, var(--section-color), transparent 140%);
	opacity: 0.16;
}

.whats-new-art > span {
	position: relative;
}

.art-words,
.art-sentence {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
}

.art-line {
	/* one line, whatever the tile's width */
	white-space: nowrap;
	padding: 4px 10px;
	border-radius: 8px;
	background: #fff;
	color: #2a2d48;
	font-size: 18px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.art-line mark {
	padding: 0 2px;
	border-radius: 3px;
	color: #fff;
	background: var(--section-color);
}

.art-sentence mark {
	background: #f100a1;
}

.art-base {
	font-size: 13px;
	font-weight: 700;
	color: var(--section-color);
}

.art-english {
	font-size: 12px;
	font-style: italic;
	color: #555;
}

.art-pages {
	display: flex;
	align-items: center;
	gap: 12px;
}

.art-youtube {
	width: 52px;
	height: 37px;
	filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.15));
}

.art-plus {
	font-size: 20px;
	font-weight: 700;
	color: #888;
}

/* a translate mark: 文 and A on a blue tile */
.art-translate {
	position: relative;
	width: 40px;
	height: 40px;
	border-radius: 10px;
	background: #1a73e8;
	color: #fff;
	box-shadow: 0 2px 3px rgba(0, 0, 0, 0.15);
}

.art-translate span {
	position: absolute;
	left: 6px;
	top: 3px;
	font-size: 19px;
	font-weight: 700;
}

.art-translate b {
	position: absolute;
	right: 5px;
	bottom: 2px;
	font-size: 15px;
}

.art-summary {
	display: flex;
	align-items: center;
	gap: 10px;
}

.art-chip {
	position: relative;
	display: flex;
	flex-direction: column;
	border-radius: 9px;
	background: #f5f5f9;
	box-shadow: 0 0 0 2px #30a46c, 0 2px 4px rgba(0, 0, 0, 0.1);
}

.art-chip-chars {
	padding: 1px 16px;
	border-radius: 9px 9px 0 0;
	background: #f100a1;
	color: #fff;
	font-size: 20px;
	text-align: center;
}

.art-chip-stages {
	display: flex;
	align-items: center;
	gap: 3px;
	padding: 4px 5px;
	color: #30a46c;
	font-size: 10px;
	font-weight: 800;
}

.art-chip-stages b {
	padding: 0 5px;
	border-radius: 999px;
	color: #fff;
	font-size: 9px;
	line-height: 1.6;
}

.art-chip .art-check {
	position: absolute;
	top: -6px;
	right: -6px;
	width: 16px;
	height: 16px;
	border: 2px solid #fff;
	border-radius: 50%;
	background: #30a46c;
	color: #fff;
	font-size: 9px;
	font-style: normal;
	font-weight: 900;
	line-height: 13px;
	text-align: center;
}

.art-up {
	font-size: 13px;
	font-weight: 800;
	color: #30a46c;
}

/* the popup */
.compact .whats-new-highlights {
	gap: 8px;
}

.compact .whats-new-art {
	height: 80px;
}

/* the popup's tiles are narrower: smaller text, so the sentences fit on a line */
.compact .art-line {
	padding: 3px 8px;
	font-size: 15px;
}

.compact .whats-new-highlight .whats-new-body {
	padding: 8px 11px 12px;
}

.compact {
	gap: 16px;
}

.compact .whats-new-grid {
	grid-template-columns: 1fr;
	gap: 6px;
}

.compact .whats-new-card {
	padding: 10px 12px;
}

.compact .whats-new-icon {
	width: 32px;
	height: 32px;
	border-radius: 9px;
}

.compact .whats-new-icon svg {
	width: 18px;
	height: 18px;
}

.compact .whats-new-body b {
	font-size: 13px;
}

.compact .whats-new-text {
	font-size: 12px;
}

.compact .whats-new-fix p {
	font-size: 12px;
}
</style>

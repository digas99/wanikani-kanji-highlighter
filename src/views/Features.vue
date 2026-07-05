<template>
	<div class="container features-page">
		<Teleport to="#secPageButtons">
			<button
				type="button"
				class="toc-toggle"
				title="Table of Contents"
				@click.stop="toggleToc"
			>
				<img src="/icons/search/menu.png" alt="Table of Contents">
			</button>
		</Teleport>

		<nav
			class="table-of-contents"
			:class="{ 'slide-from-left': tocOpen }"
			@click.stop
		>
			<h2>Table of Contents</h2>
			<ul>
				<li v-for="item in toc" :key="item.id">
					<a href="#" @click.prevent="scrollTo(item.id)">{{ item.label }}</a>
				</li>
			</ul>
		</nav>

		<div class="features-stack">
			<section id="subject-details" class="feature-card">
				<div class="feature-card-title">Subject Details</div>
				<div class="feature-card-body">
					<p>
						Throughout the Extension Popup, you will find <b>Subject Tiles</b> that can open a
						<b>Subject Details Popup</b>. Depending on which mouse button you use when clicking on it,
						you will open the details popup in different places.
					</p>
					<div class="subject-details-info">
						<RouterLink
							:to="{ name: 'Subject', params: { id: 602 } }"
							class="subject-tile clickable"
						>
							金
						</RouterLink>
						<div class="subject-details-info-mouse-click">
							<img class="icon" src="@/assets/icons/features/left-click.png" alt="">
							<div><b>Left click</b> — popup opens on the current web page you are browsing.</div>
						</div>
						<div class="subject-details-info-mouse-click">
							<img class="icon" src="@/assets/icons/features/right-click.png" alt="">
							<div><b>Right click</b> — popup opens inside this extension popup.</div>
						</div>
					</div>
				</div>
			</section>

			<section id="shortcut-keys" class="feature-card">
				<div class="feature-card-title">Shortcut Keys</div>
				<div class="feature-card-body">
					<p>
						Shortcut keys available to use on the Subject Details Popup. These will collide with any
						existing shortcut within the web page you are visiting.
					</p>
					<div class="keys-list">
						<div v-for="entry in shortcutKeys" :key="entry.keys.join('-')" class="keys-list-entry">
							<div class="keys-list-keys">
								<div
									v-for="key in entry.keys"
									:key="key"
									class="keys-list-key"
								>
									<img class="icon" src="@/assets/icons/features/keyboard-key.png" alt="">
									<span>{{ key }}</span>
								</div>
							</div>
							<div class="keys-list-description">{{ entry.description }}</div>
						</div>
					</div>
				</div>
			</section>

			<section id="real-time-search" class="feature-card">
				<div class="feature-card-title">Real Time Search</div>
				<div class="feature-card-body">
					<p>
						It is possible to search for subjects by highlighting any text on the <b>web</b>. This action
						will trigger a search in the extension popup with the selected text.
					</p>
					<p>This works better if you pop out the extension window with the <b>Popout</b> button on the <b>Sidebar</b>.</p>
					<p class="try-label"><b>Try it yourself!</b></p>
					<ol class="feature-steps">
						<li>Click the <b>Popout</b> button. Place the new window where it fits you best.</li>
						<li class="feature-step-demo">
							<div class="popout-example">
								<div class="side-panel-tab">
									<div class="navbar-icon">
										<img src="@/assets/icons/features/popup.png" alt="Popout">
										<p>Popout</p>
									</div>
								</div>
							</div>
						</li>
						<li>Highlight any text on the web to begin search. You can use the mockup page below as an example.</li>
						<li class="feature-step-demo">
							<div class="popout-webpage">
								<div>en.wikipedia.org/wiki/Japan</div>
								<div class="popout-webpage-content" @mouseup="onMockupSelect">
									<h3>Japan</h3>
									<div><b>Japan</b> is an island country in East Asia located in the northwest Pacific Ocean.</div>
								</div>
							</div>
						</li>
					</ol>
				</div>
			</section>

			<section id="subjects-data-error" class="feature-card">
				<div class="feature-card-title">Subjects Data Error</div>
				<div class="feature-card-body">
					<p>
						During the process of fetching data from Wanikani servers or updating the extension, it is
						possible for some data from the subjects to get lost.
					</p>
					<p>
						If this ever becomes noticeable — maybe wrong highlighting, or the subject details popup
						doesn't load — you can <b>Clear Subjects Data</b> at the bottom of the
						<RouterLink :to="{ name: 'Settings' }">Settings Page</RouterLink>.
						This will trigger a fresh fetch of all data from Wanikani and hopefully fix any unwanted error.
					</p>
				</div>
			</section>

			<section id="legacy-subjects" class="feature-card">
				<div class="feature-card-title">Legacy Subjects</div>
				<div class="feature-card-body">
					<p>
						Curious about subjects that are no longer available?
						<RouterLink :to="{ name: 'Search', query: { q: 'legacy' } }">
							Search for 'legacy' on the <b>Search bar</b>.
						</RouterLink>
					</p>
					<p>Make sure you have the <em>Disabled Subjects</em> option enabled in Search settings.</p>
				</div>
			</section>
		</div>
	</div>
</template>

<script>
export default {
	name: 'Features',

	data() {
		return {
			tocOpen: false,
			toc: [
				{ id: 'subject-details', label: 'Subject Details' },
				{ id: 'shortcut-keys', label: 'Shortcut Keys' },
				{ id: 'real-time-search', label: 'Real Time Search' },
				{ id: 'subjects-data-error', label: 'Subjects Data Error' },
				{ id: 'legacy-subjects', label: 'Legacy Subjects' },
			],
			shortcutKeys: [
				{ keys: ['X'], description: 'Close the popup.' },
				{ keys: ['O'], description: 'Expand the popup when it is opened on the bottom right corner.' },
				{ keys: ['L'], description: 'Lock current subject. Hovering over other kanji will not change the subject.' },
				{ keys: ['F'], description: 'Pin popup, fixing it to the page. It will not close, even if you click outside of it.' },
				{ keys: ['B'], description: 'Show details from the previous subject.' },
				{ keys: ['Y'], description: 'Copy characters from current subject to clipboard.' },
				{ keys: ['U'], description: 'Scroll back to the top of the popup.' },
				{ keys: ['I'], description: 'Scroll to the Info section.' },
				{ keys: ['C'], description: 'Scroll to the Cards section.' },
				{ keys: ['S'], description: 'Scroll to the Stats section.' },
				{ keys: ['T'], description: 'Scroll to the Timestamps section.' },
				{ keys: ['⬅', '➡'], description: 'Scroll back and forth between the sections.' },
			],
		};
	},

	mounted() {
		document.addEventListener('click', this.onDocumentClick);
	},

	beforeUnmount() {
		document.removeEventListener('click', this.onDocumentClick);
	},

	methods: {
		toggleToc() {
			this.tocOpen = !this.tocOpen;
		},
		closeToc() {
			this.tocOpen = false;
		},
		onDocumentClick(event) {
			if (!this.tocOpen) return;
			if (event.target.closest('.table-of-contents') || event.target.closest('.toc-toggle')) return;
			this.closeToc();
		},
		scrollTo(id) {
			this.closeToc();
			document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		},
		onMockupSelect() {
			const selectedText = window.getSelection()?.toString().trim();
			if (selectedText) {
				this.$router.push({ name: 'Search', query: { q: selectedText } });
			}
		},
	},
};
</script>

<style scoped>
.features-page {
	padding-top: 12px;
	padding-bottom: 24px;
}

.features-stack {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.feature-card {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 2px 10px var(--shadow-soft-color);
	scroll-margin-top: calc(var(--topbar-height) + 12px);
}

.feature-card-title {
	padding: 9px 14px;
	background: var(--default-color);
	color: white;
	font-weight: bold;
	font-size: 13px;
}

.feature-card-body {
	padding: 14px;
}

.feature-card-body p,
.feature-card-body li {
	color: var(--muted-color);
	font-size: 13px;
	line-height: 1.55;
	margin: 0 0 10px;
}

.feature-card-body p:last-child,
.feature-card-body li:last-child {
	margin-bottom: 0;
}

.try-label {
	margin-top: 4px !important;
	color: var(--default-color) !important;
}

.feature-steps {
	padding-left: 18px;
	margin: 0;
}

.feature-step-demo {
	list-style: none;
	margin: 10px 0 10px -18px;
}

.subject-tile {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 52px;
	height: 52px;
	font-size: 26px;
	color: white;
	background-color: var(--kanji-tag-color);
	border-radius: 10px;
	text-decoration: none;
	box-shadow: 0 2px 8px rgba(241, 0, 161, 0.25);
}

.subject-details-info {
	display: flex;
	align-items: center;
	column-gap: 12px;
	flex-wrap: nowrap;
	margin-top: 14px;
}

.subject-details-info-mouse-click {
	display: flex;
	align-items: center;
	column-gap: 8px;
	flex: 1;
	min-width: 0;
}

.subject-details-info-mouse-click img {
	width: 30px;
	flex-shrink: 0;
}

.subject-details-info-mouse-click div {
	color: var(--muted-color);
	font-size: 12px;
	line-height: 1.45;
}

.keys-list {
	display: flex;
	flex-direction: column;
	row-gap: 8px;
	margin-top: 12px;
}

.keys-list-entry {
	display: flex;
	align-items: center;
	column-gap: 12px;
	padding: 8px 10px;
	background: var(--surface-muted-color);
	border-radius: 8px;
}

.keys-list-keys {
	display: flex;
	align-items: center;
	column-gap: 5px;
	flex-shrink: 0;
}

.keys-list-key {
	position: relative;
	width: fit-content;
	display: flex;
	text-align: center;
	font-weight: bold;
}

.keys-list-key img {
	width: 25px;
}

.keys-list-key span {
	position: absolute;
	left: 0;
	right: 0;
	color: white;
	font-size: 11px;
	line-height: 25px;
}

.keys-list-description {
	color: var(--font-sec-color);
	font-size: 12px;
	line-height: 1.4;
}

.popout-example .side-panel-tab {
	width: fit-content;
	padding: 6px 12px;
	background-color: var(--default-color);
	border-radius: 8px;
}

.popout-example .navbar-icon {
	display: flex;
	column-gap: 10px;
	align-items: center;
}

.popout-example .navbar-icon img {
	width: 20px;
}

.popout-example .navbar-icon p {
	color: white;
	font-weight: bold;
	font-size: 15px;
	margin: 0;
}

.popout-webpage {
	background-color: var(--mock-surface-color);
	color: var(--font-color);
	padding: 10px;
	width: 100%;
	border-radius: 10px;
	box-sizing: border-box;
	border: 1px solid var(--surface-border-color);
}

.popout-webpage > div:first-child {
	padding: 8px 14px;
	background-color: var(--fill-color);
	border-radius: 999px;
	color: var(--mock-text-color);
	margin-bottom: 10px;
	font-size: 12px;
	border: 1px solid var(--surface-border-color);
}

.popout-webpage-content {
	padding: 4px 2px;
	cursor: text;
	user-select: text;
}

.popout-webpage-content h3 {
	color: var(--font-color);
	margin: 0 0 6px;
	font-size: 18px;
}

.table-of-contents {
	position: fixed;
	top: var(--topbar-height);
	left: -220px;
	width: 210px;
	height: calc(100vh - var(--topbar-height));
	background-color: var(--default-color);
	z-index: 12;
	transition: left 0.2s ease;
	box-shadow: 4px 0 16px rgba(0, 0, 0, 0.12);
}

.table-of-contents h2 {
	color: white;
	padding: 14px 16px 10px;
	margin: 0;
	font-size: 14px;
	font-weight: 700;
}

.table-of-contents ul {
	display: flex;
	flex-direction: column;
	padding: 0;
	margin: 0;
	list-style: none;
}

.table-of-contents a {
	display: block;
	font-size: 13px;
	padding: 8px 16px;
	color: white;
	text-decoration: none;
}

.table-of-contents a:hover {
	background-color: var(--wanikani);
}

.slide-from-left {
	left: 0;
}
</style>

<style>
#secPageButtons {
	display: flex;
	align-items: center;
	height: 100%;
}

.toc-toggle {
	height: 100%;
	width: 35px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	background: transparent;
	cursor: pointer;
	padding: 0;
}

.toc-toggle img {
	filter: invert(1);
	width: 19px;
}

.toc-toggle:hover {
	background-color: var(--wanikani);
}
</style>

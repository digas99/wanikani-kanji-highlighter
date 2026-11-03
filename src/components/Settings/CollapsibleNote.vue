<template>
	<!--
		A long note (the backup warnings): open the first time it's seen, and when `startOpen`
		(its switch just turned on); else its first lines, fading out, to open by hand.
	-->
	<div class="collapsible-note" :class="{ open }" role="note">
		<div ref="body" class="collapsible-note-body" :style="open ? null : { maxHeight: `${collapsedHeight}px` }">
			<slot></slot>
		</div>
		<button type="button" class="collapsible-note-toggle" :aria-expanded="open" @click="open = !open">
			{{ open ? 'Show less' : 'Show more' }}
			<svg viewBox="0 0 24 24" aria-hidden="true" :class="{ up: open }"><path d="M6 9l6 6 6-6" /></svg>
		</button>
	</div>
</template>

<script>
const SEEN_KEY = 'collapsibleNotesSeen';

function readSeen() {
	try {
		const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
		return Array.isArray(seen) ? seen : [];
	} catch {
		return [];
	}
}

export default {
	name: 'CollapsibleNote',

	props: {
		/** remembers having been seen (open the first time only) */
		noteId: { type: String, required: true },
		/** open from the start (its switch turned on just now: the note appears with it) */
		startOpen: Boolean,
		/** what shows while closed */
		collapsedHeight: { type: Number, default: 46 },
	},

	data() {
		return { open: this.startOpen || !readSeen().includes(this.noteId) };
	},

	mounted() {
		// seen now: closed from the next time
		const seen = readSeen();
		if (!seen.includes(this.noteId)) {
			try {
				localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, this.noteId]));
			} catch {
				// only a convenience
			}
		}
	},
};
</script>

<style scoped>
.collapsible-note-body {
	position: relative;
	overflow: hidden;
}

/* closed: its last visible line fades out (into the note's own background) */
.collapsible-note:not(.open) .collapsible-note-body {
	-webkit-mask-image: linear-gradient(180deg, #000 45%, transparent);
	mask-image: linear-gradient(180deg, #000 45%, transparent);
}

.collapsible-note-toggle {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-top: 4px;
	padding: 0;
	border: none;
	background: transparent;
	color: var(--font-sec-color);
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
}

.collapsible-note-toggle:hover {
	color: var(--font-color);
}

.collapsible-note-toggle svg {
	width: 13px;
	height: 13px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-linejoin: round;
	transition: transform 0.15s;
}

.collapsible-note-toggle svg.up {
	transform: rotate(180deg);
}
</style>

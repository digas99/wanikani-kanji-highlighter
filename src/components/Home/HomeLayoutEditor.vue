<template>
	<ul ref="list" class="home-layout-editor">
		<li
			v-for="(section, index) in sections"
			:key="section.id"
			class="home-layout-row"
			:class="{ 'is-hidden': !section.visible }"
		>
			<button
				type="button"
				class="home-layout-handle"
				:title="`Drag to move ${section.label} (or focus and use ↑ ↓)`"
				:aria-label="`Move ${section.label}`"
				@keydown.up.prevent="move(index, index - 1)"
				@keydown.down.prevent="move(index, index + 1)"
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
					<circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
					<circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
				</svg>
			</button>
			<span class="home-layout-label">{{ section.label }}</span>
			<span v-if="!section.visible" class="home-layout-tag">Hidden</span>
			<button
				type="button"
				class="home-layout-eye"
				:title="section.visible ? `Hide ${section.label}` : `Show ${section.label}`"
				:aria-pressed="section.visible"
				@click="toggle(index)"
			>
				<svg v-if="section.visible" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
				</svg>
				<svg v-else viewBox="0 0 24 24" aria-hidden="true">
					<path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.8 17.8 0 0 1-3.2 4.2M6.6 6.6A17.6 17.6 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
				</svg>
			</button>
		</li>
	</ul>
</template>

<script>
import Sortable from 'sortablejs';

/**
 * Reorder (drag the handle with SortableJS: mouse or touch) and show / hide the Home
 * page sections. v-model: [{ id, label, visible }] in display order.
 */
export default {
	name: 'HomeLayoutEditor',

	props: {
		modelValue: { type: Array, required: true },
	},

	emits: ['update:modelValue'],

	computed: {
		sections() {
			return this.modelValue;
		},
	},

	mounted() {
		this.sortable = Sortable.create(this.$refs.list, {
			handle: '.home-layout-handle',
			animation: 150,
			ghostClass: 'home-layout-ghost',
			chosenClass: 'home-layout-chosen',
			onEnd: ({ item, from, oldIndex, newIndex }) => {
				if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
				// Vue owns the rows: put Sortable's DOM move back, then reorder through the data
				from.removeChild(item);
				from.insertBefore(item, from.children[oldIndex] ?? null);
				this.move(oldIndex, newIndex, { focus: false });
			},
		});
	},

	beforeUnmount() {
		this.sortable?.destroy();
		this.sortable = null;
	},

	methods: {
		emitOrder(next) {
			this.$emit('update:modelValue', next);
		},
		toggle(index) {
			const next = this.sections.map((section, i) => (i === index ? { ...section, visible: !section.visible } : section));
			this.emitOrder(next);
		},
		move(from, to, { focus = true } = {}) {
			if (to < 0 || to >= this.sections.length || from === to) return;
			const next = [...this.sections];
			const [moved] = next.splice(from, 1);
			next.splice(to, 0, moved);
			this.emitOrder(next);
			// keyboard moves: keep the focus on the moved row's handle
			if (focus) this.$nextTick(() => this.$refs.list?.querySelectorAll('.home-layout-handle')[to]?.focus());
		},
	},
};
</script>

<style scoped>
.home-layout-editor {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.home-layout-row {
	position: relative;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 8px 8px 4px;
	border: 1px solid var(--surface-border-color);
	border-radius: 10px;
	background: var(--fill-color);
	box-shadow: 0 1px 4px var(--shadow-soft-color);
	transition: opacity 0.15s ease;
}

/* SortableJS: the row being dragged, and the gap where it will land */
.home-layout-row.home-layout-chosen {
	box-shadow: 0 8px 20px var(--shadow-soft-color), 0 0 0 2px var(--pill-color, #e36f94);
}

.home-layout-row.home-layout-ghost {
	opacity: 0.35;
}

/* not .hidden: the popup's global .hidden would remove the row */
.home-layout-row.is-hidden {
	opacity: 0.55;
}

.home-layout-handle,
.home-layout-eye {
	display: flex;
	padding: 4px;
	border: none;
	border-radius: 6px;
	background: transparent;
	cursor: pointer;
	touch-action: none;
}

.home-layout-handle {
	cursor: grab;
}

.home-layout-handle:hover,
.home-layout-handle:focus-visible,
.home-layout-eye:hover {
	background: var(--surface-muted-color);
	outline: none;
}

.home-layout-handle svg {
	width: 18px;
	height: 18px;
	fill: var(--font-sec-color);
}

.home-layout-eye svg {
	width: 18px;
	height: 18px;
	fill: none;
	stroke: var(--font-sec-color);
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.home-layout-label {
	flex: 1;
	min-width: 0;
	font-size: 13px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
}

.home-layout-tag {
	padding: 1px 7px;
	border-radius: 999px;
	background: var(--surface-muted-color);
	font-size: 10.5px;
	font-weight: 700;
	color: var(--font-sec-color);
}

</style>

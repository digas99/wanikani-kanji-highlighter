<template>
	<div class="setting-row">
		<label :for="inputId" class="settings-item-label">
			{{ label }}
			<div v-if="description" class="settings-description">{{ description }}</div>
		</label>
		<div class="settings-slider setting-control">
			<input
				:id="inputId"
				type="range"
				class="settings-item-input"
				:value="modelValue"
				:min="min"
				:max="max"
				@input="$emit('update:modelValue', Number($event.target.value))"
			>
			<span>{{ modelValue }}</span>
		</div>
	</div>
</template>

<script>
export default {
	name: 'SettingSlider',

	props: {
		modelValue: {
			type: Number,
			required: true,
		},
		label: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			default: '',
		},
		inputId: {
			type: String,
			required: true,
		},
		min: {
			type: Number,
			required: true,
		},
		max: {
			type: Number,
			required: true,
		},
	},

	emits: ['update:modelValue'],
};
</script>

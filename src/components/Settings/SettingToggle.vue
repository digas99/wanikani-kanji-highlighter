<template>
	<div class="setting-row">
		<label :for="inputId" class="settings-item-label">
			{{ label }}
			<div v-if="description" class="settings-description">{{ description }}</div>
		</label>
		<div
			class="checkbox_wrapper clickable setting-control"
			:class="{ 'checkbox-enabled': modelValue }"
			@click="toggle"
		>
			<input
				:id="inputId"
				type="checkbox"
				class="settings-item-input"
				:checked="modelValue"
				style="display: none;"
				@change="onChange"
			>
			<div class="custom-checkbox-ball"></div>
			<div class="custom-checkbox-back"></div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'SettingToggle',

	props: {
		modelValue: {
			type: Boolean,
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
	},

	emits: ['update:modelValue'],

	methods: {
		toggle() {
			this.$emit('update:modelValue', !this.modelValue);
		},
		onChange(event) {
			this.$emit('update:modelValue', event.target.checked);
		},
	},
};
</script>

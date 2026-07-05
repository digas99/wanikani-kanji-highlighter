<template>
	<div>
		<div class="logo-container">
			<img :src="logo" alt="Logo" />
			<span>Wanikani Kanji Highlighter</span>
		</div>
		<form @submit.prevent="login">
			<div class="input-container">
				<input
					v-model="apiKey"
					id="apiKey"
					placeholder="Enter Wanikani API Key"
					type="text"
					autocomplete="off"
					spellcheck="false"
					:disabled="validating"
					required
				/>
			</div>
			<p v-if="errorMessage" class="login-error">{{ errorMessage }}</p>
			<p v-else-if="successMessage" class="login-success">{{ successMessage }}</p>
			<button type="submit" :disabled="validating">
				{{ validating ? 'Checking…' : 'Login' }}
			</button>
			<div class="bottom">
				<a href="https://www.wanikani.com/settings/personal_access_tokens" target="_blank">Find API Key</a>
				<span class="version">v{{ version }}</span>
			</div>
		</form>
	</div>
</template>

<script>
import { ref } from "vue";
import { DEFAULT_PROXY } from '@/lib/apiClient';
import { normalizeApiKey, validateApiKey } from '@/utils/scripts/apiKeyValidation';

import logo from '@/assets/logo.png';

export default {
	emits: ['login'],

	data() {
		return {
			apiKey: '',
			proxyServer: DEFAULT_PROXY,
			version: ref(chrome.runtime.getManifest().version),
			logo,
			validating: false,
			errorMessage: '',
			successMessage: '',
		};
	},

	mounted() {
		document.body.style.paddingRight = "unset";
		document.body.style.minHeight = "unset";
		document.body.style.marginTop = "unset";
	},

	beforeUnmount() {
		document.body.style.paddingRight = null;
		document.body.style.minHeight = null;
		document.body.style.marginTop = null;
	},

	methods: {
		async login() {
			this.errorMessage = '';
			this.successMessage = '';
			this.validating = true;

			try {
				const result = await validateApiKey(this.apiKey);
				if (!result.ok) {
					this.errorMessage = result.error;
					return;
				}

				this.successMessage = `Welcome, ${result.username}!`;
				this.$emit('login', normalizeApiKey(this.apiKey), this.proxyServer);
			} finally {
				this.validating = false;
			}
		},
	},
};
</script>

<style scoped>
.logo-container {
	display: flex;
	justify-content: center;
	padding: 10px 0;
	background-color: var(--default-color);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
}

.logo-container img {
	max-width: 35%;
	height: auto;
}

.logo-container span {
	font-size: 17px;
	font-weight: bold;
	color: white;
	padding: 5px 0;
}

form {
	text-align: center;
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.input-container {}

input {
	width: 90%;
	margin: auto;
	padding: 10px 15px;
	border: none;
	outline: none;
	border-bottom: 1px solid var(--default-color);
	text-align: center;
}

input:disabled {
	opacity: 0.7;
}

button {
	background-color: var(--default-color);
	color: white;
	border: none;
	padding: 10px;
	border-radius: 50px;
	cursor: pointer;
	width: 30%;
	margin: auto;
}

button:disabled {
	opacity: 0.7;
	cursor: wait;
}

button:hover:not(:disabled) {
	background-color: var(--wanikani);
}

.login-error {
	margin: 0;
	padding: 0 12px;
	font-size: 12px;
	line-height: 1.4;
	color: #c62828;
}

.login-success {
	margin: 0;
	padding: 0 12px;
	font-size: 12px;
	line-height: 1.4;
	color: #2e7d32;
}

.version {
	font-size: 12px;
	color: silver;
}

.bottom {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
}
</style>

<style>
body {
	padding: unset;
}
</style>

<script lang="ts">
	import { url } from 'inspector';
	import { googleListMail } from '../../googleApi/GoogleListMail';
	import type { CodeBlockOptions, GoogleMessage } from '../../helper/types';
	export let codeBlockOptions: CodeBlockOptions;
	let messages: Promise<GoogleMessage[]> = googleListMail(
		codeBlockOptions.inboxId
	);
</script>

<div class="mail-block">
	<h5 class="mail-title">Inbox</h5>
	{#await messages}
		<span>Loading messages...</span>
	{:then messages}
		{#if !messages.length}
            <span>No messages</span>
        {:else}
			<div class="mail-list">
				{#each messages as message}
					<div
						class="mail-row"
						on:click={() => window.open(message.url)}
						on:keypress={() => window.open(message.url)}
					>
						<div class="mail-from"><span>{message.from}</span></div>
						<div class="mail-subject"><span>{message.subject}</span></div>
					</div>
				{/each}
			</div>
		{/if}
	{/await}
</div>

<style>
	.mail-list {
	}
    .mail-title {

    }
	.mail-row {
		cursor: pointer;
		display: grid;
		grid-template-columns: max(120px, 30%) 1fr;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}
	.mail-row:hover {
		background-color: var(--background-modifier-hover);
	}
	.mail-from {
		font-weight: bold;
		padding: 10px;
	}
	.mail-subject {
		padding: 10px;
	}
</style>

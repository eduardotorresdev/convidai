<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		rotulo: string;
		para: string;
		dica?: string;
		erro?: string;
		children: Snippet;
	};

	let { rotulo, para, dica, erro, children }: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
	<label for={para} class="text-sm font-medium text-tinta">{rotulo}</label>
	{#if dica}
		<p id="{para}-dica" class="text-xs text-suave">{dica}</p>
	{/if}
	{@render children()}
	{#if erro}
		<p id="{para}-erro" role="alert" class="text-xs font-medium text-terracota-forte">{erro}</p>
	{/if}
</div>

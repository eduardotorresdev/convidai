<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { corDeFundo, type Tema } from '$lib/tema';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	/*
	 * A barra do navegador acompanha o fundo da página. Só as telas de Convite
	 * publicam um tema; o resto do app fica na cor padrão.
	 */
	const tema = $derived((page.data as { tema?: Tema | null }).tema ?? null);
</script>

<svelte:head>
	<meta name="theme-color" content={corDeFundo(tema)} />
</svelte:head>

<div class="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[env(safe-area-inset-bottom)]">
	{@render children()}
</div>

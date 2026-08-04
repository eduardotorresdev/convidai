<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Tom = 'accent' | 'secundario' | 'fantasma' | 'sim' | 'nao';
	type Props = {
		tom?: Tom;
		largo?: boolean;
		href?: string;
		children: Snippet;
	} & Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'children'>;

	let { tom = 'accent', largo = false, href, children, ...resto }: Props = $props();

	// 48px de altura mínima: este app é usado com o polegar.
	const base =
		'inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-controle)] ' +
		'px-5 text-[0.9375rem] font-medium transition-colors select-none ' +
		'disabled:cursor-not-allowed disabled:opacity-45';

	const tons: Record<Tom, string> = {
		accent: 'bg-terracota text-white hover:bg-terracota-forte active:bg-terracota-forte',
		secundario: 'border border-linha-forte bg-papel text-tinta hover:bg-creme',
		fantasma: 'text-suave hover:bg-terracota-fraca hover:text-terracota',
		sim: 'bg-sim text-white hover:brightness-110',
		nao: 'border border-linha-forte bg-papel text-tinta hover:bg-creme'
	};
</script>

{#if href}
	<a {href} class="{base} {tons[tom]} {largo ? 'w-full' : ''}" {...resto}>{@render children()}</a>
{:else}
	<button class="{base} {tons[tom]} {largo ? 'w-full' : ''}" {...resto}>{@render children()}</button>
{/if}

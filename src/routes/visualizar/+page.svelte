<script lang="ts">
	import Botao from '$lib/components/Botao.svelte';
	import Carta from '$lib/components/Carta.svelte';
	import { formatarPrazo } from '$lib/estado';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function resumo(t: { abertos: number; sim: number; nao: number }): string {
		return `${t.abertos} viram · ${t.sim} vão · ${t.nao} não`;
	}
</script>

<svelte:head>
	<title>Seus convites · Convidai</title>
</svelte:head>

<header class="flex flex-col gap-1 pt-8 pb-6">
	<h1 class="text-3xl">Seus convites</h1>
	<div class="flex flex-wrap items-center gap-x-2 text-sm text-suave">
		<span>{data.anfitriao.nome}</span>
		<span aria-hidden="true">·</span>
		<form method="POST" action="?/sair">
			<input type="hidden" name="redirectTo" value="/" />
			<button
				class="-mx-2 flex min-h-12 items-center rounded-[var(--radius-controle)] px-2 underline underline-offset-2 hover:text-terracota"
			>
				Sair
			</button>
		</form>
	</div>
</header>

{#if data.convites.length === 0}
	<div class="flex flex-1 flex-col items-center justify-center gap-4 pb-24 text-center">
		<svg
			viewBox="0 0 120 96"
			class="h-28 w-36 text-linha-forte"
			role="img"
			aria-label="Um envelope aberto, vazio"
		>
			<rect
				x="8"
				y="24"
				width="104"
				height="64"
				rx="8"
				fill="var(--color-papel)"
				stroke="currentColor"
				stroke-width="3"
			/>
			<path
				d="M8 32 60 64 112 32"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linejoin="round"
			/>
			<path
				d="M34 24 60 6 86 24"
				fill="none"
				stroke="var(--color-terracota)"
				stroke-width="3"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		</svg>
		<h2 class="text-xl">Você ainda não tem convites</h2>
		<p class="max-w-xs text-sm text-suave">
			Suba a arte da sua festa, escolha um prazo e mande o link pra quem você quer por perto.
		</p>
		<Botao href="/criar" tom="accent">Criar convite</Botao>
	</div>
{:else}
	<ul class="flex flex-col gap-3 pb-28">
		{#each data.convites as convite (convite.hash)}
			<li>
				<a
					href="/visualizar/{convite.hash}"
					class="block rounded-[var(--radius-carta)] focus-visible:outline-offset-4"
				>
					<Carta classe="flex items-center gap-4 p-4">
						<img
							src="/uploads/{convite.imagem}"
							alt="Arte do convite {convite.titulo}"
							class="size-16 shrink-0 rounded-[var(--radius-controle)] border border-linha object-cover"
							loading="lazy"
						/>
						<span class="flex min-w-0 flex-col gap-1">
							<span class="truncate font-display text-lg font-semibold">{convite.titulo}</span>
							<span class="text-sm text-suave">{resumo(convite.totais)}</span>
							{#if convite.prazo}
								<span class="text-xs text-suave">Confirma até {formatarPrazo(convite.prazo)}</span>
							{/if}
						</span>
					</Carta>
				</a>
			</li>
		{/each}
	</ul>

	<div
		class="sticky bottom-0 -mx-5 mt-auto bg-gradient-to-t from-creme via-creme px-5 pt-6
		       pb-[max(1rem,env(safe-area-inset-bottom))]"
	>
		<Botao href="/criar" tom="accent" largo>+ Criar convite</Botao>
	</div>
{/if}

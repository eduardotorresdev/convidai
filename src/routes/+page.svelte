<script lang="ts">
	import Botao from '$lib/components/Botao.svelte';
	import Carta from '$lib/components/Carta.svelte';

	const passos = [
		{ titulo: 'Suba a arte', texto: 'Aquela imagem quadrada que você já tem pronta.' },
		{ titulo: 'Convide quem importa', texto: 'Cada pessoa recebe um link só dela, pelo WhatsApp.' },
		{ titulo: 'Veja quem vai', texto: 'Quem abriu, quem confirmou e quem ficou no silêncio.' }
	];
</script>

<svelte:head>
	<title>Convidai — convites que dizem quem vai</title>
	<meta
		name="description"
		content="Publique seu convite em imagem, mande um link pessoal pra cada pessoa no WhatsApp e acompanhe quem abriu e quem confirmou presença."
	/>
</svelte:head>

<header class="flex items-center justify-between gap-4 py-4">
	<span class="font-display text-xl font-semibold tracking-tight">convidai</span>
	<a
		href="/entrar"
		class="-mr-2 inline-flex min-h-12 items-center rounded-[var(--radius-controle)] px-3 text-sm text-suave hover:text-terracota"
	>
		Entrar
	</a>
</header>

<main class="flex flex-col gap-14 pt-6 pb-16">
	<section class="flex flex-col gap-5">
		<h1 class="text-4xl leading-[1.1] sm:text-5xl">Convites que dizem quem vai</h1>
		<p class="text-lg text-suave">
			Você manda a arte da festa pelo WhatsApp como sempre. A diferença é que agora dá pra saber quem
			abriu e quem confirmou.
		</p>

		<!-- Amostra de um Convite. Arte puramente decorativa: nenhuma imagem real envolvida. -->
		<div aria-hidden="true">
			<Carta classe="overflow-hidden">
				<div
					class="flex aspect-square flex-col justify-end p-6 text-white"
					style="background-image: radial-gradient(120% 90% at 15% 12%, #e08a5a 0%, transparent 55%), linear-gradient(150deg, #bc4b2a 5%, #9d3d22 55%, #5d2a19 100%)"
				>
					<p class="text-xs tracking-[0.28em] uppercase opacity-80">18 de outubro · 20h</p>
					<p class="font-display mt-2 text-3xl leading-tight font-semibold">
						Aniversário<br />da Clarice
					</p>
					<p class="mt-3 text-sm opacity-85">Rua das Palmeiras, 240</p>
				</div>
				<div class="flex items-center justify-between gap-4 border-t border-linha px-5 py-4">
					<p class="text-sm text-suave">Você vai?</p>
					<div class="flex gap-2">
						<span
							class="inline-flex min-h-9 items-center rounded-[var(--radius-controle)] bg-sim px-4 text-sm font-medium text-white"
						>
							Vou
						</span>
						<span
							class="inline-flex min-h-9 items-center rounded-[var(--radius-controle)] border border-linha-forte px-4 text-sm font-medium text-suave"
						>
							Não vou
						</span>
					</div>
				</div>
			</Carta>
		</div>

		<Botao href="/entrar" tom="accent" largo>Começar</Botao>
	</section>

	<section class="flex flex-col gap-6">
		<h2 class="text-2xl">Como funciona</h2>
		<ol class="flex flex-col gap-6">
			{#each passos as passo, i (passo.titulo)}
				<li class="flex gap-4">
					<span
						class="font-display mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-terracota-fraca text-base font-semibold text-terracota-forte"
					>
						{i + 1}
					</span>
					<div class="flex flex-col gap-1">
						<h3 class="text-lg">{passo.titulo}</h3>
						<p class="text-sm text-suave">{passo.texto}</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>
</main>

<footer class="mt-auto border-t border-linha py-6 text-sm text-suave">convidai</footer>

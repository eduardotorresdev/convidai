<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import Botao from '$lib/components/Botao.svelte';
	import Carta from '$lib/components/Carta.svelte';
	import { formatarPrazo } from '$lib/estado';
	import { caminhoDoConvite } from '$lib/ids';
	import type { PageProps, SubmitFunction } from './$types';

	let { data, form }: PageProps = $props();

	const convite = $derived(data.convite);

	/** A resposta recém-gravada manda sobre a que veio do load. */
	const resposta = $derived(form && 'resposta' in form ? form.resposta : data.resposta);
	const virouAnonimo = $derived(Boolean(form && 'virouAnonimo' in form && form.virouAnonimo));
	const prazoVencido = $derived(
		data.venceu || Boolean(form && 'motivo' in form && form.motivo === 'prazo_vencido')
	);

	let trocando = $state(false);
	let enviando = $state(false);

	/** Fonte única da regra: quando os dois botões de RSVP aparecem. */
	const mostrandoBotoes = $derived(!prazoVencido && (resposta === null || trocando));

	let caixaDosBotoes = $state<HTMLDivElement | null>(null);

	/** Sem isso o clique destrói o próprio botão focado e o foco cai no <body>. */
	async function mudarResposta() {
		trocando = true;
		await tick();
		caixaDosBotoes?.querySelector('button')?.focus();
	}

	const canonica = $derived(page.url.origin + caminhoDoConvite(convite.hash, convite.slug));
	const imagemAbsoluta = $derived(`${page.url.origin}/uploads/${convite.imagem}`);

	const resumo = $derived(
		convite.descricao.replace(/\s+/g, ' ').trim().slice(0, 180) ||
			`Você foi convidado: ${convite.titulo}`
	);

	const ROTULO_RESPOSTA = { sim: 'Vou', nao: 'Não vou' } as const;

	const aoEnviar: SubmitFunction = () => {
		enviando = true;
		return async ({ update }) => {
			await update();
			enviando = false;
			trocando = false;
		};
	};
</script>

<svelte:head>
	<title>{convite.titulo} · convidai</title>
	<meta name="description" content={resumo} />
	<link rel="canonical" href={canonica} />

	<meta property="og:title" content={convite.titulo} />
	<meta property="og:description" content={resumo} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonica} />
	<meta property="og:image" content={imagemAbsoluta} />
	<meta property="og:image:width" content="1080" />
	<meta property="og:image:height" content="1080" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<main class="flex flex-1 flex-col gap-8 py-8">
	<img
		src="/uploads/{convite.imagem}"
		alt="Arte do convite: {convite.titulo}"
		width="1080"
		height="1080"
		loading="eager"
		fetchpriority="high"
		class="aspect-square w-full rounded-[var(--radius-carta)] object-cover shadow-[var(--shadow-carta)]"
	/>

	<header class="flex flex-col gap-3">
		<h1 class="text-3xl leading-tight">
			{#if data.nomeConvidado}
				Oi, {data.nomeConvidado}!
			{:else}
				{convite.titulo}
			{/if}
		</h1>

		{#if data.nomeConvidado}
			<p class="text-lg font-medium text-tinta">{convite.titulo}</p>
		{/if}

		{#if convite.descricao}
			<p class="text-base/relaxed whitespace-pre-line text-suave">{convite.descricao}</p>
		{/if}

		{#if convite.prazo && !prazoVencido}
			<p class="text-sm text-suave">Confirme até {formatarPrazo(convite.prazo)}</p>
		{/if}
	</header>

	<section aria-live="polite" class="flex flex-col gap-4">
		{#if prazoVencido}
			<Carta classe="px-5 py-6">
				<h2 class="text-lg">As confirmações encerraram</h2>
				{#if resposta}
					<p class="mt-2 text-base text-suave">
						Você respondeu: <strong class="font-medium text-tinta"
							>{ROTULO_RESPOSTA[resposta]}</strong
						>
					</p>
				{:else}
					<p class="mt-2 text-base text-suave">
						O prazo para responder este convite já passou. Fale direto com quem convidou.
					</p>
				{/if}
			</Carta>
		{:else if !mostrandoBotoes}
			<Carta classe="flex flex-col items-start gap-3 px-5 py-6">
				<p class="flex items-center gap-2 text-lg">
					<svg
						viewBox="0 0 20 20"
						aria-hidden="true"
						class="size-5 shrink-0 {resposta === 'sim' ? 'text-sim' : 'text-suave'}"
					>
						<path
							d="M4 10.5 8 14.5 16 6"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					{#if resposta === 'sim'}
						Você confirmou presença.
					{:else}
						Você avisou que não poderá ir.
					{/if}
				</p>
				<Botao tom="fantasma" onclick={mudarResposta}>Mudar minha resposta</Botao>
			</Carta>
		{:else}
			<div bind:this={caixaDosBotoes} class="flex flex-col gap-3">
				<!--
					Dois <form> separados, com a resposta em input hidden: assim o RSVP
					funciona no WebView do WhatsApp mesmo que o JS não carregue, sem
					depender do value do botão submetido.
				-->
				{#each [{ valor: 'sim', rotulo: 'Sim, eu vou!', tom: 'sim' }, { valor: 'nao', rotulo: 'Não poderei ir', tom: 'nao' }] as const as opcao (opcao.valor)}
					<form method="POST" action="?/responder" use:enhance={aoEnviar}>
						<input type="hidden" name="resposta" value={opcao.valor} />
						<input type="hidden" name="token" value={data.token ?? ''} />
						<Botao type="submit" tom={opcao.tom} largo disabled={enviando}>
							{opcao.rotulo}
						</Botao>
					</form>
				{/each}
			</div>
		{/if}

		{#if virouAnonimo}
			<p
				role="status"
				class="rounded-[var(--radius-controle)] border border-linha bg-terracota-fraca px-4 py-3 text-sm/relaxed text-tinta"
			>
				Este link pessoal já tinha sido usado em outro aparelho, então guardamos a sua resposta sem
				nome. Ela continua contando — só não dá pra saber que foi você.
			</p>
		{/if}

		{#if form && 'motivo' in form && form.motivo === 'resposta_invalida'}
			<p role="status" class="text-sm text-terracota-forte">
				Não entendemos a sua resposta. Tente de novo.
			</p>
		{/if}
	</section>

	<footer class="mt-auto pt-6 pb-4 text-center">
		<a href="/" class="text-xs tracking-wide text-suave hover:text-terracota">convidai</a>
	</footer>
</main>

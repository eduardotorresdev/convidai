<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import Botao from '$lib/components/Botao.svelte';
	import Campo from '$lib/components/Campo.svelte';
	import Carta from '$lib/components/Carta.svelte';
	import { formatarPrazo } from '$lib/estado';
	import { paraHtmlWhatsApp } from '$lib/formatacao';
	import { caminhoDoConvite } from '$lib/ids';
	import { cssDoTema } from '$lib/tema';
	import type { PageProps, SubmitFunction } from './$types';

	let { data, form }: PageProps = $props();

	const convite = $derived(data.convite);

	// A Resposta bem-sucedida termina em redirect pro Link Pessoal do Convidado,
	// então ela sempre chega pelo load — `form` aqui só carrega recusa.
	const resposta = $derived(data.resposta);
	const prazoVencido = $derived(
		data.venceu || Boolean(form && 'motivo' in form && form.motivo === 'prazo_vencido')
	);

	/*
	 * Sem Convidado próprio, responder é também se apresentar: o nome digitado
	 * aqui é o que o Anfitrião vai ver na lista, e sem ele não há a quem atribuir
	 * a Resposta. Por isso os dois botões só destravam depois de preenchido.
	 */
	// Só o valor inicial mesmo: quem digitou e errou é quem está sem JS, e nesse
	// caminho a página volta renderizada do servidor com o nome de volta no campo.
	// svelte-ignore state_referenced_locally
	let nome = $state(form && 'nome' in form ? String(form.nome ?? '') : '');
	const erroNome = $derived(
		form && 'motivo' in form && form.motivo === 'nome_obrigatorio'
			? 'Escreva o seu nome para responder.'
			: form && 'motivo' in form && form.motivo === 'nome_longo'
				? 'O nome pode ter até 60 caracteres.'
				: ''
	);
	const faltaNome = $derived(data.precisaNome && nome.trim() === '');

	let trocando = $state(false);
	let enviando = $state(false);

	/** Fonte única da regra: quando os dois botões de RSVP aparecem. */
	const mostrandoBotoes = $derived(!prazoVencido && (resposta === null || trocando));

	let caixaDosBotoes = $state<HTMLFormElement | null>(null);

	/** Sem isso o clique destrói o próprio botão focado e o foco cai no <body>. */
	async function mudarResposta() {
		trocando = true;
		await tick();
		caixaDosBotoes?.querySelector('button')?.focus();
	}

	const canonica = $derived(page.url.origin + caminhoDoConvite(convite.hash, convite.slug));
	const imagemAbsoluta = $derived(`${page.url.origin}/uploads/${convite.imagem}`);

	const descricaoFormatada = $derived(paraHtmlWhatsApp(convite.descricao));

	// A arte manda na paleta da página inteira, servida já pintada no HTML: nada
	// de piscar bege antes de virar a cor do Convite.
	const estiloDoTema = $derived(cssDoTema(data.tema));

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
	<link rel="canonical" href={canonica} />

	<!--
		Sem og:description de propósito: a descrição já vai no corpo da mensagem
		compartilhada, e repeti-la no card do WhatsApp mostraria o mesmo texto
		duas vezes. O card fica com título e arte.
	-->
	<meta property="og:title" content={convite.titulo} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonica} />
	<meta property="og:image" content={imagemAbsoluta} />
	<meta property="og:image:width" content="1080" />
	<meta property="og:image:height" content="1080" />
	<meta name="twitter:card" content="summary_large_image" />

	{#if estiloDoTema}
		{@html `<style>${estiloDoTema}</style>`}
	{/if}
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
		<!--
			O título não aparece no corpo: a arte já o carrega, e repeti-lo empurra a
			descrição e os botões para baixo. Ele continua no <title>, no og:title e no
			alt da arte — é de lá que sai o preview do link no WhatsApp. Quando não há
			saudação, fica só como cabeçalho para leitor de tela.
		-->
		{#if data.nomeConvidado}
			<h1 class="text-3xl leading-tight">Oi, {data.nomeConvidado}!</h1>
		{:else}
			<h1 class="sr-only">{convite.titulo}</h1>
		{/if}

		<!--
			`@html` é seguro aqui porque `paraHtmlWhatsApp` escapa o texto do Anfitrião
			antes de qualquer outra coisa e só emite tags próprias. Precisa ser <div>:
			<ul> e <blockquote> não podem viver dentro de <p>.
		-->
		{#if convite.descricao}
			<div class="descricao text-base/relaxed text-suave">{@html descricaoFormatada}</div>
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
			<!--
				Um <form> só, com a resposta no value do botão: o campo de nome pertence
				a um form e não pode ser compartilhado por dois. Sem JS continua de pé —
				o WebView do WhatsApp manda o value do botão submetido normalmente, e o
				`required` do input segura o envio sem nome.
			-->
			<form
				method="POST"
				action="?/responder"
				use:enhance={aoEnviar}
				bind:this={caixaDosBotoes}
				class="flex flex-col gap-4"
			>
				<input type="hidden" name="token" value={data.token ?? ''} />

				{#if data.precisaNome}
					<Campo
						rotulo="Como é o seu nome?"
						para="nome-resposta"
						dica="É assim que você vai aparecer para quem convidou."
						erro={erroNome}
					>
						<input
							id="nome-resposta"
							name="nome"
							type="text"
							required
							autocomplete="name"
							maxlength="60"
							bind:value={nome}
							aria-describedby="nome-resposta-dica"
							class="min-h-12 w-full rounded-[var(--radius-controle)] border border-linha-forte
							       bg-papel px-4 text-tinta placeholder:text-suave/70"
							placeholder="Ex.: Marta Ribeiro"
						/>
					</Campo>
				{/if}

				<div class="flex flex-col gap-3">
					{#each [{ valor: 'sim', rotulo: 'Sim, eu vou!', tom: 'sim' }, { valor: 'nao', rotulo: 'Não poderei ir', tom: 'nao' }] as const as opcao (opcao.valor)}
						<Botao
							type="submit"
							name="resposta"
							value={opcao.valor}
							tom={opcao.tom}
							largo
							disabled={enviando || faltaNome}
						>
							{opcao.rotulo}
						</Botao>
					{/each}
				</div>
			</form>
		{/if}

		{#if data.linkJaUsado}
			<p
				role="status"
				class="rounded-[var(--radius-controle)] border border-linha bg-terracota-fraca px-4 py-3 text-sm/relaxed text-tinta"
			>
				Este link pessoal já tinha sido usado em outro aparelho, então guardamos a sua resposta em
				separado, com o nome que você escreveu. Ela continua contando.
			</p>
		{/if}

		{#if form && 'motivo' in form && form.motivo === 'resposta_invalida'}
			<p role="status" class="text-sm text-terracota-forte">
				Não entendemos a sua resposta. Tente de novo.
			</p>
		{/if}
	</section>

	<footer class="mt-auto pt-6 pb-4 text-center">
		<a href="/" class="text-xs tracking-wide text-suave transition-colors hover:text-terracota">
			Faça seu convite gratuito ·
			<span class="font-medium">convites.celebre.digital</span>
		</a>
	</footer>
</main>

<!--
	O HTML da descrição vem de `@html`, então não recebe o hash de escopo do Svelte —
	daí o `:global()`. O Tailwind aqui está sem o plugin `typography` e o reset zera
	lista e citação, então cada tag emitida pelo formatador é vestida à mão.
-->
<style>
	.descricao :global(* + p),
	.descricao :global(p + *),
	.descricao :global(ul + *),
	.descricao :global(ol + *),
	.descricao :global(blockquote + *) {
		margin-top: 0.75em;
	}

	.descricao :global(strong) {
		font-weight: 600;
		color: var(--color-tinta);
	}

	.descricao :global(em) {
		font-style: italic;
	}

	.descricao :global(s) {
		text-decoration-line: line-through;
	}

	.descricao :global(ul),
	.descricao :global(ol) {
		padding-left: 1.25rem;
	}

	.descricao :global(ul) {
		list-style: disc;
	}

	.descricao :global(ol) {
		list-style: decimal;
	}

	.descricao :global(li + li) {
		margin-top: 0.25em;
	}

	.descricao :global(blockquote) {
		border-left: 3px solid var(--color-linha-forte);
		padding-left: 0.75rem;
	}

	.descricao :global(code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.9em;
		background-color: var(--color-terracota-fraca);
		border-radius: 0.375rem;
		padding: 0.1em 0.35em;
	}

	/* O bloco ```mono``` guarda as quebras de linha e não pode estourar a largura no celular. */
	.descricao :global(code.mono) {
		display: inline-block;
		max-width: 100%;
		overflow-x: auto;
		white-space: pre-wrap;
		padding: 0.4em 0.6em;
	}
</style>

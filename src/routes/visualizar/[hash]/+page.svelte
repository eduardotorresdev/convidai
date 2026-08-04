<script lang="ts">
	import { enhance } from '$app/forms';
	import Botao from '$lib/components/Botao.svelte';
	import BotoesDeEnvio from '$lib/components/BotoesDeEnvio.svelte';
	import Campo from '$lib/components/Campo.svelte';
	import Carta from '$lib/components/Carta.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { caminhoDoConvite } from '$lib/ids';
	import {
		ROTULO_ESTADO,
		ehAnonimo,
		estadoDo,
		formatarPrazo,
		nomeExibido,
		prazoVencido,
		totalizar,
		type EstadoConvidado
	} from '$lib/estado';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let editando = $state(false);
	let apagando = $state(false);
	let menuAberto = $state(false);
	let recado = $state('');

	const caminho = $derived(caminhoDoConvite(data.convite.hash, data.convite.slug));
	const linkAberto = $derived(`${data.origem}${caminho}`);
	const totais = $derived(totalizar(data.convidados));
	const vencido = $derived(prazoVencido(data.convite.prazo));

	/** A numeração dos Anônimos é posicional — o Anfitrião nunca sabe quem são. */
	const listados = $derived.by(() => {
		let anonimos = 0;
		return data.convidados.map((c) => {
			const anonimo = ehAnonimo(c);
			if (anonimo) anonimos += 1;
			return { convidado: c, anonimo, nome: nomeExibido(c, anonimos), estado: estadoDo(c) };
		});
	});

	const CORES_ESTADO: Record<EstadoConvidado, string> = {
		nao_abriu: 'border-linha bg-creme text-suave',
		viu: 'border-terracota-fraca bg-terracota-fraca text-terracota-forte',
		sim: 'border-sim-fraca bg-sim-fraca text-sim',
		nao: 'border-linha-forte bg-papel text-nao'
	};

	function paraCampoData(prazo: Date | null): string {
		if (!prazo) return '';
		const mes = String(prazo.getMonth() + 1).padStart(2, '0');
		const dia = String(prazo.getDate()).padStart(2, '0');
		return `${prazo.getFullYear()}-${mes}-${dia}`;
	}

	function copiarLink() {
		navigator.clipboard
			?.writeText(linkAberto)
			.then(() => (recado = 'Endereço copiado.'))
			.catch(() => (recado = 'Não deu pra copiar automaticamente.'));
	}

	function reenviar(token: string, nome: string) {
		const url = `${linkAberto}?convidado=${token}`;
		if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
			navigator
				.share({ title: data.convite.titulo, text: `${nome}, você está convidado`, url })
				.catch(() => {});
			return;
		}
		navigator.clipboard
			?.writeText(url)
			.then(() => (recado = `Link pessoal de ${nome} copiado.`))
			.catch(() => (recado = 'Não deu pra copiar automaticamente.'));
	}
</script>

<svelte:head>
	<title>{data.convite.titulo} · Convidai</title>
</svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') menuAberto = false;
	}}
/>

<header class="flex items-center justify-between gap-2 py-4">
	<a
		href="/visualizar"
		class="-ml-2 flex min-h-12 items-center gap-1 rounded-[var(--radius-controle)] px-2 text-sm text-suave hover:text-terracota"
	>
		<span aria-hidden="true">←</span> Seus convites
	</a>

	<div class="relative">
		<button
			type="button"
			onclick={() => (menuAberto = !menuAberto)}
			aria-expanded={menuAberto}
			aria-haspopup="true"
			class="flex size-12 items-center justify-center rounded-full text-suave hover:bg-terracota-fraca hover:text-terracota"
		>
			<span class="sr-only">Mais ações do convite</span>
			<span aria-hidden="true" class="text-xl leading-none">⋯</span>
		</button>

		{#if menuAberto}
			<!-- Camada de captura: fecha o menu no toque fora, sem window.confirm. -->
			<button
				type="button"
				aria-label="Fechar menu"
				class="fixed inset-0 z-10 cursor-default"
				onclick={() => (menuAberto = false)}
			></button>
			<div
				class="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-[var(--radius-controle)] border border-linha bg-papel shadow-[var(--shadow-flutuante)]"
			>
				<button
					type="button"
					onclick={() => {
						menuAberto = false;
						editando = true;
					}}
					class="flex min-h-12 w-full items-center px-4 text-left text-sm hover:bg-creme"
				>
					Editar convite
				</button>
				<button
					type="button"
					onclick={() => {
						menuAberto = false;
						apagando = true;
					}}
					class="flex min-h-12 w-full items-center border-t border-linha px-4 text-left text-sm text-terracota-forte hover:bg-terracota-fraca"
				>
					Apagar convite
				</button>
			</div>
		{/if}
	</div>
</header>

<div class="flex flex-col gap-6 pb-16">
	<section class="flex flex-col gap-4">
		<button
			type="button"
			onclick={() => (editando = true)}
			class="group relative block w-full overflow-hidden rounded-[var(--radius-carta)] border border-linha"
		>
			<img
				src="/uploads/{data.convite.imagem}"
				alt="Arte do convite {data.convite.titulo}"
				class="aspect-square w-full object-cover"
			/>
			<span
				class="absolute right-3 bottom-3 rounded-full bg-papel/95 px-3 py-2 text-xs font-medium text-tinta shadow-[var(--shadow-carta)]"
			>
				Trocar arte
			</span>
		</button>

		<!--
		  Título e descrição ficam FORA do botão: <button> só aceita conteúdo de
		  frase, e um <h1> lá dentro some da estrutura de cabeçalhos da página.
		-->
		<div class="flex items-start justify-between gap-2">
			<h1 class="min-w-0 flex-1 text-2xl">{data.convite.titulo}</h1>
			<button
				type="button"
				onclick={() => (editando = true)}
				aria-label="Editar título"
				class="-mt-1 -mr-2 flex size-12 shrink-0 items-center justify-center rounded-full text-suave hover:bg-terracota-fraca hover:text-terracota"
			>
				<span aria-hidden="true">✎</span>
			</button>
		</div>

		<div class="flex items-start justify-between gap-2">
			{#if data.convite.descricao}
				<p class="min-w-0 flex-1 text-sm whitespace-pre-line text-tinta">{data.convite.descricao}</p>
			{:else}
				<p class="min-w-0 flex-1 text-sm text-suave">Sem descrição ainda.</p>
			{/if}
			<button
				type="button"
				onclick={() => (editando = true)}
				aria-label="Editar descrição"
				class="-mt-3 -mr-2 flex size-12 shrink-0 items-center justify-center rounded-full text-suave hover:bg-terracota-fraca hover:text-terracota"
			>
				<span aria-hidden="true">✎</span>
			</button>
		</div>

		<button
			type="button"
			onclick={() => (editando = true)}
			class="-mx-2 flex min-h-12 flex-wrap items-center gap-x-1 rounded-[var(--radius-controle)] px-2 text-left text-sm"
		>
			{#if data.convite.prazo}
				<span class:text-suave={!vencido} class:text-terracota-forte={vencido}>
					{vencido ? 'Prazo encerrado em' : 'Confirma até'}
					{formatarPrazo(data.convite.prazo)}
				</span>
			{:else}
				<span class="text-suave">Sem prazo de confirmação</span>
			{/if}
			<span class="text-xs text-suave underline underline-offset-2">Editar prazo</span>
		</button>
	</section>

	<Carta classe="flex flex-col gap-2 p-4">
		<p class="flex items-center gap-2 text-xs text-suave">
			<span aria-hidden="true">🔒</span>
			Este endereço nunca muda, mesmo se você editar o título.
		</p>
		<div class="flex items-center gap-2">
			<code class="min-w-0 flex-1 truncate rounded-[var(--radius-controle)] bg-creme px-3 py-2 text-xs">
				{linkAberto}
			</code>
			<Botao tom="secundario" type="button" onclick={copiarLink}>Copiar</Botao>
		</div>
	</Carta>

	<section aria-label="Totais do convite">
		<dl class="grid grid-cols-4 gap-2 text-center">
			<div>
				<dt class="text-xs text-suave">Convidados</dt>
				<dd class="font-display text-2xl font-semibold">{totais.convidados}</dd>
			</div>
			<div>
				<dt class="text-xs text-suave">Viram</dt>
				<dd class="font-display text-2xl font-semibold">{totais.abertos}</dd>
			</div>
			<div>
				<dt class="text-xs text-suave">Vão</dt>
				<dd class="font-display text-2xl font-semibold text-sim">{totais.sim}</dd>
			</div>
			<div>
				<dt class="text-xs text-suave">Não vão</dt>
				<dd class="font-display text-2xl font-semibold">{totais.nao}</dd>
			</div>
		</dl>
	</section>

	<BotoesDeEnvio
		hash={data.convite.hash}
		slug={data.convite.slug}
		titulo={data.convite.titulo}
		origem={data.origem}
	/>

	<p aria-live="polite" class="text-sm text-suave">{recado}</p>

	<section class="flex flex-col gap-3">
		<h2 class="text-lg">Convidados</h2>

		{#if listados.length === 0}
			<Carta classe="flex flex-col items-center gap-2 p-6 text-center">
				<p class="font-display text-lg">Ninguém convidado ainda</p>
				<p class="text-sm text-suave">
					Toque em <strong class="font-semibold">Convidar</strong>, ali em cima, pra mandar o primeiro
					link pessoal.
				</p>
				<span aria-hidden="true" class="text-2xl text-terracota">↑</span>
			</Carta>
		{:else}
			<ul class="flex flex-col divide-y divide-linha overflow-hidden">
				{#each listados as item (item.convidado.token)}
					<li class="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
						<span class="min-w-0 flex-1 truncate text-sm font-medium" class:text-suave={item.anonimo}>
							{item.nome}
						</span>
						<span
							class="rounded-full border px-2.5 py-1 text-xs font-medium {CORES_ESTADO[item.estado]}"
						>
							{ROTULO_ESTADO[item.estado]}
						</span>
						<div class="flex w-full items-center justify-end gap-1">
							{#if !item.anonimo}
								<Botao
									tom="fantasma"
									type="button"
									onclick={() => reenviar(item.convidado.token, item.nome)}
								>
									Reenviar
								</Botao>
							{/if}
							<form method="POST" action="?/remover" use:enhance>
								<input type="hidden" name="token" value={item.convidado.token} />
								<Botao tom="fantasma" type="submit">Remover</Botao>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<Modal bind:aberto={editando} titulo="Editar convite" aoFechar={() => (editando = false)}>
	<form
		method="POST"
		action="?/editar"
		enctype="multipart/form-data"
		class="flex flex-col gap-5"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') editando = false;
			}}
	>
		<Campo rotulo="Título" para="editar-titulo" erro={form?.acao === 'editar' ? form.erro : ''}>
			<input
				id="editar-titulo"
				name="titulo"
				type="text"
				required
				maxlength="80"
				value={data.convite.titulo}
				class="min-h-12 rounded-[var(--radius-controle)] border border-linha-forte bg-papel px-4"
			/>
		</Campo>

		<Campo rotulo="Descrição" para="editar-descricao" dica="Endereço, horário, o que levar.">
			<textarea
				id="editar-descricao"
				name="descricao"
				rows="4"
				maxlength="600"
				aria-describedby="editar-descricao-dica"
				class="rounded-[var(--radius-controle)] border border-linha-forte bg-papel px-4 py-3"
				>{data.convite.descricao}</textarea
			>
		</Campo>

		<Campo
			rotulo="Prazo de confirmação"
			para="editar-prazo"
			dica="Depois dessa data o convite continua visível, mas para de aceitar respostas. Deixe vazio pra não ter prazo."
		>
			<input
				id="editar-prazo"
				name="prazo"
				type="date"
				value={paraCampoData(data.convite.prazo)}
				aria-describedby="editar-prazo-dica"
				class="min-h-12 rounded-[var(--radius-controle)] border border-linha-forte bg-papel px-4"
			/>
		</Campo>

		<Campo rotulo="Trocar a arte" para="editar-imagem" dica="Opcional. Imagem quadrada, até 8 MB.">
			<input
				id="editar-imagem"
				name="imagem"
				type="file"
				accept="image/*"
				aria-describedby="editar-imagem-dica"
				class="min-h-12 rounded-[var(--radius-controle)] border border-linha-forte bg-papel px-4 py-2.5 text-sm"
			/>
		</Campo>

		<Botao tom="accent" largo type="submit">Salvar alterações</Botao>
	</form>
</Modal>

<Modal bind:aberto={apagando} titulo="Apagar convite?" aoFechar={() => (apagando = false)}>
	<div class="flex flex-col gap-4">
		<p class="text-sm text-suave">
			Isso apaga <strong class="font-semibold text-tinta">{data.convite.titulo}</strong>, a arte e a
			lista de {totais.convidados} convidado{totais.convidados === 1 ? '' : 's'}. O endereço para de funcionar
			e não tem como voltar atrás.
		</p>
		<form method="POST" action="?/apagar" class="flex flex-col gap-2">
			<Botao tom="accent" largo type="submit">Apagar para sempre</Botao>
			<Botao tom="fantasma" largo type="button" onclick={() => (apagando = false)}>Cancelar</Botao>
		</form>
	</div>
</Modal>

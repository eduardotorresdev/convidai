<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Botao from '$lib/components/Botao.svelte';
	import Campo from '$lib/components/Campo.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import RecorteQuadrado from '$lib/components/RecorteQuadrado.svelte';
	import type { PageProps } from './$types';

	const MAX_DESCRICAO = 600;

	let { form }: PageProps = $props();

	/*
	 * O estado nasce do que a action devolveu: sem JS a página recarrega e é assim
	 * que o formulário se repovoa. Com enhance, o componente não remonta e o que
	 * o usuário digitou continua onde estava.
	 */
	let titulo = $state(untrack(() => form?.valores?.titulo) ?? '');
	let descricao = $state(untrack(() => form?.valores?.descricao) ?? '');
	let prazo = $state(untrack(() => form?.valores?.prazo) ?? '');

	let entrada = $state<HTMLInputElement | null>(null);
	let paraRecortar = $state<File | null>(null);
	let recortada = $state<File | null>(null);
	let urlPrevia = $state('');
	let enviando = $state(false);

	const hoje = new Date();
	const hojeIso = [
		hoje.getFullYear(),
		String(hoje.getMonth() + 1).padStart(2, '0'),
		String(hoje.getDate()).padStart(2, '0')
	].join('-');

	let restantes = $derived(MAX_DESCRICAO - descricao.length);

	$effect(() => {
		const arquivo = recortada;
		if (!arquivo) {
			urlPrevia = '';
			return;
		}
		const url = URL.createObjectURL(arquivo);
		urlPrevia = url;
		return () => URL.revokeObjectURL(url);
	});

	function aoEscolherArquivo(e: Event) {
		const alvo = e.currentTarget as HTMLInputElement;
		const arquivo = alvo.files?.[0] ?? null;
		// Zerar o input deixa o usuário reescolher o MESMO arquivo depois de cancelar.
		alvo.value = '';
		if (arquivo) paraRecortar = arquivo;
	}

	function aoConfirmarRecorte(blob: Blob) {
		const extensao = blob.type === 'image/webp' ? 'webp' : 'jpg';
		recortada = new File([blob], `convite.${extensao}`, { type: blob.type });
		paraRecortar = null;
	}
</script>

<svelte:head>
	<title>Novo convite · Convidai</title>
</svelte:head>

<header class="flex flex-col gap-2 pt-6 pb-6">
	<a href="/visualizar" class="inline-flex min-h-12 items-center text-sm text-suave hover:text-terracota">
		&larr; Meus convites
	</a>
	<h1 class="text-3xl">Novo convite</h1>
</header>

<form
	method="POST"
	enctype="multipart/form-data"
	class="flex flex-col gap-6 pb-12"
	use:enhance={({ formData }) => {
		// O recorte vive só na memória; é aqui que ele entra no envio.
		if (recortada) formData.set('imagem', recortada);
		enviando = true;
		return async ({ update }) => {
			enviando = false;
			await update({ reset: false });
		};
	}}
>
	<Campo rotulo="Título" para="titulo" erro={form?.erros?.titulo}>
		<input
			id="titulo"
			name="titulo"
			type="text"
			bind:value={titulo}
			maxlength="80"
			required
			autocomplete="off"
			placeholder="Aniversário da Rita"
			class="min-h-12 w-full rounded-[var(--radius-controle)] border border-linha-forte bg-papel px-4 text-tinta placeholder:text-suave/70"
		/>
	</Campo>

	<Campo
		rotulo="Imagem"
		para="imagem"
		dica="A arte quadrada que vai no WhatsApp."
		erro={form?.erros?.imagem}
	>
		<!-- sr-only e não display:none: escondido do olho, mas ainda focável pelo teclado. -->
		<input
			bind:this={entrada}
			id="imagem"
			name="imagem"
			type="file"
			accept="image/*"
			class="peer sr-only"
			onchange={aoEscolherArquivo}
		/>
		<div
			class="rounded-[var(--radius-carta)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracota"
		>
			{#if urlPrevia}
				<div class="flex flex-col gap-3">
					<img
						src={urlPrevia}
						alt="Prévia da arte recortada do convite"
						class="aspect-square w-full rounded-[var(--radius-carta)] border border-linha object-cover"
					/>
					<Botao type="button" tom="fantasma" onclick={() => entrada?.click()}>Trocar imagem</Botao>
				</div>
			{:else}
				<label
					for="imagem"
					class="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-carta)] border border-dashed border-linha-forte bg-papel px-6 text-center"
				>
					<span class="text-base font-medium text-tinta">Escolher imagem</span>
					<span class="text-xs text-suave">Você recorta em quadrado no passo seguinte.</span>
				</label>
			{/if}
		</div>
	</Campo>

	<Campo rotulo="Descrição" para="descricao" erro={form?.erros?.descricao}>
		<textarea
			id="descricao"
			name="descricao"
			bind:value={descricao}
			rows="5"
			maxlength={MAX_DESCRICAO}
			placeholder="Onde é, que horas, o que levar."
			class="w-full rounded-[var(--radius-controle)] border border-linha-forte bg-papel p-4 text-tinta placeholder:text-suave/70"
		></textarea>
		<p aria-live="polite" class="text-xs text-suave">
			{restantes} caracteres restantes
		</p>
	</Campo>

	<Campo
		rotulo="Prazo de confirmação"
		para="prazo"
		dica="Opcional. Depois dessa data o convite para de aceitar respostas."
		erro={form?.erros?.prazo}
	>
		<input
			id="prazo"
			name="prazo"
			type="date"
			bind:value={prazo}
			min={hojeIso}
			class="min-h-12 w-full rounded-[var(--radius-controle)] border border-linha-forte bg-papel px-4 text-tinta"
		/>
	</Campo>

	<Botao type="submit" largo disabled={enviando}>
		{enviando ? 'Criando…' : 'Criar convite'}
	</Botao>
</form>

<Modal
	aberto={paraRecortar !== null}
	titulo="Enquadrar a arte"
	aoFechar={() => (paraRecortar = null)}
>
	{#if paraRecortar}
		<RecorteQuadrado
			arquivo={paraRecortar}
			aoConfirmar={aoConfirmarRecorte}
			aoCancelar={() => (paraRecortar = null)}
		/>
	{/if}
</Modal>

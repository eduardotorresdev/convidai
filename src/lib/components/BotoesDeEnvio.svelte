<script lang="ts">
	import Botao from './Botao.svelte';
	import ConvidarModal from './ConvidarModal.svelte';
	import { abrirPartilha, mensagemDoConvite } from '$lib/compartilhar';
	import { caminhoDoConvite } from '$lib/ids';

	type Props = {
		hash: string;
		slug: string;
		titulo: string;
		descricao: string;
		origem: string;
		arte: File | null;
	};
	let { hash, slug, titulo, descricao, origem, arte }: Props = $props();

	let convidando = $state(false);
	let recado = $state('');

	const linkAberto = $derived(`${origem}${caminhoDoConvite(hash, slug)}`);

	function compartilhar() {
		const mensagem = mensagemDoConvite(descricao, linkAberto);

		const partilha = abrirPartilha(titulo, mensagem, arte);
		if (partilha) {
			// AbortError é o Anfitrião fechando a folha — não é erro que mereça recado.
			partilha.catch(() => {});
			return;
		}

		navigator.clipboard
			?.writeText(mensagem)
			.then(() => (recado = 'Convite copiado. Cole no WhatsApp.'))
			.catch(() => (recado = 'Não deu pra copiar. Selecione o endereço acima e copie na mão.'));
	}
</script>

<div class="flex flex-col gap-3">
	<Botao tom="accent" largo type="button" onclick={() => (convidando = true)}>Convidar</Botao>

	<div class="flex flex-col">
		<Botao tom="secundario" largo type="button" onclick={compartilhar}>Compartilhar</Botao>

		<div
			role="note"
			class="relative mt-3 rounded-[var(--radius-controle)] bg-terracota-fraca px-4 py-3
			       text-xs leading-relaxed text-tinta"
		>
			<span
				aria-hidden="true"
				class="absolute -top-1 left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-[2px] bg-terracota-fraca"
			></span>
			<strong class="font-semibold">O link aberto não identifica ninguém.</strong>
			Quem responder por ele entra na sua lista como anônimo, e você nunca saberá quem foi. Para saber
			quem confirmou, use <strong class="font-semibold">Convidar</strong> e mande um link por pessoa.
		</div>
	</div>

	<p aria-live="polite" class="text-sm text-suave">{recado}</p>
</div>

<ConvidarModal
	bind:aberto={convidando}
	{hash}
	{slug}
	{titulo}
	{descricao}
	{origem}
	{arte}
	aoFechar={() => (convidando = false)}
/>

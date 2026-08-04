<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import Botao from './Botao.svelte';
	import Campo from './Campo.svelte';
	import Modal from './Modal.svelte';
	import { abrirPartilha, mensagemDoConvite } from '$lib/compartilhar';
	import { caminhoDoConvite, novoTokenConvidado } from '$lib/ids';

	type Props = {
		aberto: boolean;
		hash: string;
		slug: string;
		titulo: string;
		descricao: string;
		origem: string;
		arte: File | null;
		aoFechar: () => void;
	};

	let {
		aberto = $bindable(),
		hash,
		slug,
		titulo,
		descricao,
		origem,
		arte,
		aoFechar
	}: Props = $props();

	let nome = $state('');
	let erroNome = $state('');
	let aviso = $state('');
	let falha = $state<{ token: string; nome: string } | null>(null);
	let enviando = $state(false);

	/*
	 * O modal é o mesmo componente entre uma pessoa e outra: sem esta limpeza, quem
	 * fecha depois de um erro reabre com o nome e o token da tentativa anterior.
	 */
	$effect(() => {
		if (!aberto) {
			nome = '';
			erroNome = '';
			aviso = '';
			falha = null;
		}
	});

	function linkPessoal(token: string): string {
		return `${origem}${caminhoDoConvite(hash, slug)}?convidado=${token}`;
	}

	/** POST da action `convidar`. Roda em paralelo com a folha de compartilhamento. */
	async function gravar(token: string, nomeConvidado: string) {
		const corpo = new FormData();
		corpo.set('token', token);
		corpo.set('nome', nomeConvidado);

		const resposta = await fetch('?/convidar', {
			method: 'POST',
			body: corpo,
			// Sem este cabeçalho o Kit responde com redirect em vez do resultado da action.
			headers: { 'x-sveltekit-action': 'true' }
		});
		const resultado = deserialize(await resposta.text());
		if (resultado.type !== 'success') throw new Error('convidar falhou');
	}

	async function acompanhar(token: string, nomeConvidado: string, partilhou: boolean) {
		enviando = true;
		try {
			await gravar(token, nomeConvidado);
			falha = null;
			await invalidateAll();
			nome = '';
			if (partilhou) {
				aoFechar();
			} else {
				aviso = 'Convidado criado e convite copiado. Cole no WhatsApp dele.';
			}
		} catch {
			falha = { token, nome: nomeConvidado };
			aviso = '';
		} finally {
			enviando = false;
		}
	}

	function enviar(evento: SubmitEvent) {
		evento.preventDefault();
		const limpo = nome.trim();
		if (!limpo) {
			erroNome = 'Escreva o nome de quem você vai convidar.';
			return;
		}
		if (limpo.length > 60) {
			erroNome = 'O nome pode ter até 60 caracteres.';
			return;
		}
		erroNome = '';
		aviso = '';

		const token = novoTokenConvidado();
		const mensagem = mensagemDoConvite(descricao, linkPessoal(token));

		/*
		 * ARMADILHA: no iOS Safari o navigator.share() só abre se for chamado no
		 * mesmo tick do gesto. Nenhum await pode vir antes desta linha — por isso o
		 * token nasce no cliente, a arte já veio baixada de fora e o POST vai
		 * depois, em paralelo.
		 */
		const partilha = abrirPartilha(titulo, mensagem, arte);

		if (partilha) {
			// AbortError é o usuário fechando a folha — o Convidado já foi criado
			// de propósito e o Anfitrião reenvia pela lista quando quiser.
			partilha.catch(() => {});
		} else {
			navigator.clipboard?.writeText(mensagem).catch(() => {});
		}

		void acompanhar(token, limpo, partilha !== null);
	}

	function tentarDeNovo() {
		if (!falha) return;
		void acompanhar(falha.token, falha.nome, false);
	}
</script>

<Modal bind:aberto {aoFechar} titulo="Convidar alguém">
	<form class="flex flex-col gap-5" onsubmit={enviar}>
		<Campo
			rotulo="Nome de quem você vai convidar"
			para="nome-convidado"
			dica="Cada pessoa recebe um link próprio — é assim que você sabe quem respondeu o quê."
			erro={erroNome}
		>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				id="nome-convidado"
				name="nome"
				type="text"
				autocomplete="off"
				autofocus
				maxlength="60"
				bind:value={nome}
				aria-describedby="nome-convidado-dica"
				class="min-h-12 rounded-[var(--radius-controle)] border border-linha-forte bg-papel px-4
				       text-tinta placeholder:text-suave"
				placeholder="Ex.: Tia Marta"
			/>
		</Campo>

		<Botao tom="accent" largo type="submit" disabled={enviando}>
			{enviando ? 'Convidando…' : 'Convidar e compartilhar'}
		</Botao>

		<p aria-live="polite" class="text-sm text-suave">{aviso}</p>

		{#if falha}
			<div class="flex flex-col gap-3 rounded-[var(--radius-controle)] bg-terracota-fraca p-4">
				<p role="alert" class="text-sm text-terracota-forte">
					Não deu pra salvar <strong>{falha.nome}</strong> na lista. O link já foi gerado — tente de
					novo pra não perder o registro.
				</p>
				<Botao tom="secundario" type="button" onclick={tentarDeNovo} disabled={enviando}>
					Tentar de novo
				</Botao>
			</div>
		{/if}
	</form>
</Modal>

<script lang="ts">
	import Botao from './Botao.svelte';

	type Props = {
		arquivo: File;
		aoConfirmar: (blob: Blob) => void;
		aoCancelar: () => void;
	};

	let { arquivo, aoConfirmar, aoCancelar }: Props = $props();

	/*
	 * Mesmo lado que o servidor grava (uploads.LADO). Duplicado aqui de propósito:
	 * $lib/server nunca pode ser importado por código que roda no navegador.
	 */
	const LADO_FINAL = 1080;
	const ZOOM_MAX = 4;

	let tela = $state<HTMLCanvasElement | null>(null);
	let imagem = $state<HTMLImageElement | null>(null);
	let falhouAoAbrir = $state(false);
	let processando = $state(false);

	/** Lado do canvas em pixels CSS — medido, porque ele ocupa a largura disponível. */
	let lado = $state(0);

	let escalaMin = $state(1);
	let escala = $state(1);
	let dx = $state(0);
	let dy = $state(0);

	let zoom = $derived(escalaMin > 0 ? escala / escalaMin : 1);

	$effect(() => {
		const url = URL.createObjectURL(arquivo);
		const img = new Image();
		img.onload = () => (imagem = img);
		img.onerror = () => (falhouAoAbrir = true);
		img.src = url;
		return () => URL.revokeObjectURL(url);
	});

	// Toda vez que a imagem ou o tamanho do canvas muda, volta pro enquadramento "cover".
	$effect(() => {
		const img = imagem;
		if (!img || lado === 0) return;
		const minima = Math.max(lado / img.naturalWidth, lado / img.naturalHeight);
		escalaMin = minima;
		escala = minima;
		dx = (lado - img.naturalWidth * minima) / 2;
		dy = (lado - img.naturalHeight * minima) / 2;
	});

	$effect(() => {
		const c = tela;
		const img = imagem;
		if (!c || !img || lado === 0) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 3);
		c.width = Math.round(lado * dpr);
		c.height = Math.round(lado * dpr);

		const ctx = c.getContext('2d');
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, lado, lado);
		ctx.drawImage(img, dx, dy, img.naturalWidth * escala, img.naturalHeight * escala);
	});

	/** A imagem nunca pode deixar buraco: o offset fica preso às bordas do quadrado. */
	function limitar() {
		const img = imagem;
		if (!img) return;
		const largura = img.naturalWidth * escala;
		const altura = img.naturalHeight * escala;
		dx = Math.min(0, Math.max(lado - largura, dx));
		dy = Math.min(0, Math.max(lado - altura, dy));
	}

	function aplicarZoom(desejada: number, ancoraX: number, ancoraY: number) {
		const alvo = Math.min(Math.max(desejada, escalaMin), escalaMin * ZOOM_MAX);
		const razao = alvo / escala;
		dx = ancoraX - (ancoraX - dx) * razao;
		dy = ancoraY - (ancoraY - dy) * razao;
		escala = alvo;
	}

	/*
	 * Um Map de ponteiros ativos resolve arrasto e pinça com o mesmo código: um
	 * dedo move o offset, dois dedos movem o offset pelo ponto médio e escalam
	 * pela razão entre as distâncias.
	 */
	const ponteiros = new Map<number, { x: number; y: number }>();

	function aoDescer(e: PointerEvent) {
		const alvo = e.currentTarget as HTMLCanvasElement;
		alvo.setPointerCapture(e.pointerId);
		ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
	}

	function aoMover(e: PointerEvent) {
		if (!ponteiros.has(e.pointerId)) return;
		e.preventDefault();

		const antes = [...ponteiros.values()].map((p) => ({ ...p }));
		ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
		const depois = [...ponteiros.values()];

		if (depois.length === 1) {
			dx += depois[0].x - antes[0].x;
			dy += depois[0].y - antes[0].y;
		} else {
			const caixa = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
			const distAntes = Math.hypot(antes[0].x - antes[1].x, antes[0].y - antes[1].y);
			const distDepois = Math.hypot(depois[0].x - depois[1].x, depois[0].y - depois[1].y);
			const meioAntesX = (antes[0].x + antes[1].x) / 2 - caixa.left;
			const meioAntesY = (antes[0].y + antes[1].y) / 2 - caixa.top;
			const meioDepoisX = (depois[0].x + depois[1].x) / 2 - caixa.left;
			const meioDepoisY = (depois[0].y + depois[1].y) / 2 - caixa.top;

			dx += meioDepoisX - meioAntesX;
			dy += meioDepoisY - meioAntesY;
			if (distAntes > 0) aplicarZoom(escala * (distDepois / distAntes), meioDepoisX, meioDepoisY);
		}

		limitar();
	}

	function aoSoltar(e: PointerEvent) {
		ponteiros.delete(e.pointerId);
	}

	function aoDeslizar(e: Event) {
		const valor = Number((e.currentTarget as HTMLInputElement).value);
		aplicarZoom(escalaMin * valor, lado / 2, lado / 2);
		limitar();
	}

	function paraBlob(canvas: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
		return new Promise((resolver) => canvas.toBlob(resolver, tipo, 0.9));
	}

	async function confirmar() {
		const img = imagem;
		if (!img || processando || lado === 0) return;
		processando = true;
		try {
			const fora = document.createElement('canvas');
			fora.width = LADO_FINAL;
			fora.height = LADO_FINAL;
			const ctx = fora.getContext('2d');
			if (!ctx) return;

			// O que está visível no canvas, convertido de volta pra coordenadas da imagem.
			const origem = lado / escala;
			ctx.drawImage(img, -dx / escala, -dy / escala, origem, origem, 0, 0, LADO_FINAL, LADO_FINAL);

			// Safari antigo devolve null pra webp; jpeg é o plano B universal.
			const blob = (await paraBlob(fora, 'image/webp')) ?? (await paraBlob(fora, 'image/jpeg'));
			if (blob) aoConfirmar(blob);
		} finally {
			processando = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	{#if falhouAoAbrir}
		<p role="alert" class="text-sm font-medium text-terracota-forte">
			Não foi possível abrir essa imagem. Tente outro arquivo.
		</p>
	{:else}
		<div bind:clientWidth={lado} class="w-full">
			<canvas
				bind:this={tela}
				onpointerdown={aoDescer}
				onpointermove={aoMover}
				onpointerup={aoSoltar}
				onpointercancel={aoSoltar}
				aria-label="Prévia do recorte. Arraste para reposicionar a imagem."
				class="block aspect-square w-full touch-none rounded-[var(--radius-controle)] bg-creme select-none"
			></canvas>
		</div>

		<p class="text-xs text-suave">Arraste para enquadrar. Use dois dedos ou o controle para ampliar.</p>

		<div class="flex flex-col gap-1.5">
			<label for="recorte-zoom" class="text-sm font-medium text-tinta">Ampliação</label>
			<input
				id="recorte-zoom"
				type="range"
				min="1"
				max={ZOOM_MAX}
				step="0.01"
				value={zoom}
				oninput={aoDeslizar}
				class="h-12 w-full accent-terracota"
			/>
		</div>
	{/if}

	<div class="flex gap-3">
		<Botao type="button" tom="secundario" largo onclick={aoCancelar}>Cancelar</Botao>
		<Botao type="button" largo onclick={confirmar} disabled={!imagem || processando}>
			Usar esta imagem
		</Botao>
	</div>
</div>

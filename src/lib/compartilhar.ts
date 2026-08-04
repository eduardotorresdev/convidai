import { paraSlug } from './ids';

/**
 * A mensagem que sai no WhatsApp: a descrição como o Anfitrião escreveu — a
 * marcação dele (`*negrito*`, listas) passa intacta, porque quem lê é o próprio
 * WhatsApp — e o link logo abaixo, separado por uma linha em branco.
 */
export function mensagemDoConvite(descricao: string, link: string): string {
	const corpo = descricao.trim();
	return corpo ? `${corpo}\n\n${link}` : link;
}

/**
 * Baixa a arte pra poder anexar na folha de compartilhamento. Tem que rodar
 * ANTES do gesto: o navigator.share() do iOS só abre se for chamado no mesmo
 * tick do clique, então não dá pra esperar este fetch lá dentro.
 *
 * Devolve null em qualquer falha — não conseguir a arte nunca pode impedir o
 * compartilhamento, que segue sem anexo e cai na prévia do link.
 */
export async function baixarArte(url: string, titulo: string): Promise<File | null> {
	try {
		const resposta = await fetch(url);
		if (!resposta.ok) return null;

		const blob = await resposta.blob();
		return new File([blob], `${paraSlug(titulo)}.webp`, { type: blob.type || 'image/webp' });
	} catch {
		return null;
	}
}

/**
 * Abre a folha de compartilhamento. Síncrona de propósito (ver `baixarArte`).
 * Devolve a Promise do share, ou null se o navegador não tem Web Share — aí
 * cabe a quem chamou copiar a mensagem pra área de transferência.
 */
export function abrirPartilha(
	titulo: string,
	texto: string,
	arte: File | null
): Promise<void> | null {
	if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return null;

	/*
	 * Sem `url`: o link já está dentro do texto, e alvos como o WhatsApp
	 * concatenam text + url — mandar os dois manda o endereço duas vezes. A
	 * prévia com a arte continua vindo, porque o WhatsApp procura o link no
	 * próprio texto da mensagem.
	 */
	const anexo = arte && navigator.canShare?.({ files: [arte] }) ? { files: [arte] } : {};
	return navigator.share({ title: titulo, text: texto, ...anexo });
}

import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { env } from '$env/dynamic/private';
import { novoHash } from '$lib/ids';
import type { Tema } from '$lib/tema';
import { extrairTema } from '$lib/server/paleta';

/**
 * Imagens vivem no filesystem, não no banco. Isso amarra o deploy a um host com
 * disco persistente (adapter-node) — Vercel/Cloudflare não servem.
 */
export const DIR_UPLOADS = resolve(env.UPLOADS_DIR || 'uploads');

export const LADO = 1080;
export const TAMANHO_MAX = 8 * 1024 * 1024;

export function caminhoDaImagem(nomeArquivo: string): string {
	// Barra a fuga de diretório: só aceitamos nomes que nós mesmos geramos.
	if (!/^[a-z0-9]+\.webp$/.test(nomeArquivo)) return '';
	return join(DIR_UPLOADS, nomeArquivo);
}

export function imagemExiste(nomeArquivo: string): boolean {
	const caminho = caminhoDaImagem(nomeArquivo);
	return caminho !== '' && existsSync(caminho);
}

/**
 * Grava a arte de um Convite como 1080x1080 .webp e destila o tema dela.
 *
 * O recorte 1:1 já foi feito pelo cliente; aqui é rede de segurança contra
 * cliente com bug ou POST forjado — nunca confiamos nas dimensões recebidas.
 * O nome do arquivo é aleatório e não deriva do hash do Convite: trocar a arte
 * precisa gerar uma URL nova, senão o cache do navegador serve a imagem velha.
 *
 * O tema sai do webp já cortado, e não do original: é essa a arte que a pessoa
 * vai ver ao lado das cores.
 */
export async function salvarImagem(
	entrada: ArrayBuffer
): Promise<{ arquivo: string; tema: Tema | null }> {
	await mkdir(DIR_UPLOADS, { recursive: true });

	const webp = await sharp(Buffer.from(entrada))
		.rotate() // respeita EXIF antes de cortar, senão foto de celular sai deitada
		.resize(LADO, LADO, { fit: 'cover', position: 'centre' })
		.webp({ quality: 82 })
		.toBuffer();

	const arquivo = `${novoHash(20)}.webp`;
	await writeFile(join(DIR_UPLOADS, arquivo), webp);
	return { arquivo, tema: await extrairTema(webp) };
}

export async function apagarImagem(nomeArquivo: string): Promise<void> {
	const caminho = caminhoDaImagem(nomeArquivo);
	if (caminho && existsSync(caminho)) await unlink(caminho);
}

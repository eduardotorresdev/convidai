import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/*
 * Hash de senha do Anfitrião com scrypt do próprio Node.
 *
 * Nada de bcrypt/argon2: são módulos nativos, e cada um a mais é mais uma
 * compilação pra dar errado no build do Dockerfile. O scrypt é function de
 * derivação de chave séria, com custo de memória, e já vem na plataforma.
 */

const derivar = promisify(scrypt) as (
	senha: string,
	sal: Buffer,
	tamanho: number
) => Promise<Buffer>;

/** Tamanho mínimo aceito. Regra única — as telas de cadastro e conta leem daqui. */
export const MINIMO = 8;

const BYTES_SAL = 16;
const BYTES_HASH = 64;

export async function gerarHash(senha: string): Promise<string> {
	const sal = randomBytes(BYTES_SAL);
	const hash = await derivar(senha, sal, BYTES_HASH);
	return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Confere a senha contra o hash guardado. `false` — nunca exceção — pra hash
 * nulo (conta só de Google) ou em formato que não reconhecemos: quem chama trata
 * os dois casos como "não entra", e é o mesmo desfecho.
 */
export async function conferir(senha: string, guardado: string | null): Promise<boolean> {
	if (!guardado) return false;

	const [algoritmo, salHex, hashHex] = guardado.split('$');
	if (algoritmo !== 'scrypt' || !salHex || !hashHex) return false;

	const esperado = Buffer.from(hashHex, 'hex');
	if (esperado.length !== BYTES_HASH) return false;

	const obtido = await derivar(senha, Buffer.from(salHex, 'hex'), BYTES_HASH);
	return timingSafeEqual(esperado, obtido);
}

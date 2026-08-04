import type { Convidado } from './server/db/schema';

export type EstadoConvidado = 'nao_abriu' | 'viu' | 'sim' | 'nao';

/** Os quatro estados que o Relatório mostra, em ordem de "quanto já se sabe". */
export function estadoDo(c: Pick<Convidado, 'resposta' | 'abertoEm'>): EstadoConvidado {
	if (c.resposta) return c.resposta;
	return c.abertoEm ? 'viu' : 'nao_abriu';
}

export const ROTULO_ESTADO: Record<EstadoConvidado, string> = {
	nao_abriu: 'Não abriu',
	viu: 'Viu, não respondeu',
	sim: 'Vai',
	nao: 'Não vai'
};

/*
 * Todo Convidado novo tem nome — o do Anfitrião ou o que a própria pessoa
 * escreveu ao responder. Isto aqui é para as linhas gravadas antes disso, quando
 * responder pelo Link Aberto rendia um Convidado Anônimo. Não some do código
 * enquanto elas existirem nos bancos em produção.
 */
export function ehAnonimo(c: Pick<Convidado, 'nome'>): boolean {
	return c.nome === null || c.nome === '';
}

export function nomeExibido(c: Pick<Convidado, 'nome'>, indiceAnonimo: number): string {
	return ehAnonimo(c) ? `Anônimo ${indiceAnonimo}` : c.nome!;
}

/** Depois do Prazo o Convite continua visível, mas para de aceitar Resposta. */
export function prazoVencido(prazo: Date | null, agora = new Date()): boolean {
	return prazo !== null && prazo.getTime() < agora.getTime();
}

export type Totais = { convidados: number; abertos: number; sim: number; nao: number };

export function totalizar(convidados: Pick<Convidado, 'resposta' | 'abertoEm'>[]): Totais {
	return {
		convidados: convidados.length,
		abertos: convidados.filter((c) => c.abertoEm !== null).length,
		sim: convidados.filter((c) => c.resposta === 'sim').length,
		nao: convidados.filter((c) => c.resposta === 'nao').length
	};
}

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', {
	weekday: 'short',
	day: '2-digit',
	month: '2-digit'
});

export function formatarPrazo(prazo: Date): string {
	return FORMATO_DATA.format(prazo).replace('.,', ',');
}

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

/*
 * Aplica as migrações versionadas em drizzle/*.sql.
 *
 * Existe pra não precisar do drizzle-kit em produção: ele é devDependency e o
 * buildpack do Dokku poda devDependencies depois do build. As migrações são
 * geradas em desenvolvimento (`npm run db:gerar`) e versionadas — o servidor só
 * as executa.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIR_MIGRACOES = join(AQUI, '..', 'drizzle');
const caminhoBanco = process.env.DATABASE_URL || 'convidai.db';

const db = new Database(caminhoBanco);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`CREATE TABLE IF NOT EXISTS _migracoes (
	nome TEXT PRIMARY KEY,
	aplicada_em INTEGER NOT NULL
)`);

const jaAplicadas = new Set(db.prepare('SELECT nome FROM _migracoes').all().map((r) => r.nome));
const pendentes = readdirSync(DIR_MIGRACOES)
	.filter((f) => f.endsWith('.sql'))
	.sort()
	.filter((f) => !jaAplicadas.has(f));

if (pendentes.length === 0) {
	console.log(`Banco em ${caminhoBanco} já está atualizado.`);
	process.exit(0);
}

const registrar = db.prepare('INSERT INTO _migracoes (nome, aplicada_em) VALUES (?, ?)');

for (const arquivo of pendentes) {
	const sql = readFileSync(join(DIR_MIGRACOES, arquivo), 'utf8');
	// O drizzle-kit separa os statements com esta marca; executar o arquivo
	// inteiro de uma vez funciona no SQLite, mas quebra o relato de erro.
	const statements = sql
		.split('--> statement-breakpoint')
		.map((s) => s.trim())
		.filter(Boolean);

	db.transaction(() => {
		for (const statement of statements) db.exec(statement);
		registrar.run(arquivo, Date.now());
	})();

	console.log(`✓ ${arquivo}`);
}

console.log(`${pendentes.length} migração(ões) aplicada(s) em ${caminhoBanco}.`);

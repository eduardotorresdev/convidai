CREATE TABLE `account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `convidados` (
	`token` text PRIMARY KEY NOT NULL,
	`convite_hash` text NOT NULL,
	`nome` text,
	`reivindicado_por` text,
	`resposta` text,
	`respondido_em` integer,
	`aberto_em` integer,
	`criado_em` integer NOT NULL,
	FOREIGN KEY (`convite_hash`) REFERENCES `convites`(`hash`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_convidados_convite` ON `convidados` (`convite_hash`,`criado_em`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_anonimo_por_visitante` ON `convidados` (`convite_hash`,`reivindicado_por`) WHERE nome is null;--> statement-breakpoint
CREATE TABLE `convites` (
	`hash` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`anfitriao_id` text NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`imagem` text NOT NULL,
	`prazo` integer,
	`criado_em` integer NOT NULL,
	FOREIGN KEY (`anfitriao_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_convites_anfitriao` ON `convites` (`anfitriao_id`,`criado_em`);--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`emailVerified` integer,
	`image` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);

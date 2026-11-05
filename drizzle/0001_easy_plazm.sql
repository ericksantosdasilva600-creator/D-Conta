CREATE TABLE `nyvo_receipts` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`mimeType` varchar(32) NOT NULL,
	`sizeBytes` int NOT NULL,
	`bytes` mediumblob NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nyvo_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nyvo_user_state` (
	`userId` int NOT NULL,
	`schemaVersion` int NOT NULL,
	`revision` int NOT NULL DEFAULT 0,
	`payload` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nyvo_user_state_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `nyvo_receipts` ADD CONSTRAINT `nyvo_receipts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nyvo_user_state` ADD CONSTRAINT `nyvo_user_state_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
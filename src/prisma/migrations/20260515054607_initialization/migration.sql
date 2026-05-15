/*
  Warnings:

  - You are about to alter the column `created_at` on the `roles` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `updated_at` on the `roles` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `disabled_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `created_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `updated_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `deleted_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to drop the `contratos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `facturas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `radicados` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `facturas` DROP FOREIGN KEY `facturas_radicado_id_fkey`;

-- DropForeignKey
ALTER TABLE `radicados` DROP FOREIGN KEY `radicados_contrato_id_fkey`;

-- AlterTable
ALTER TABLE `roles` MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `disabled_at` TIMESTAMP NULL,
    MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` TIMESTAMP NULL,
    MODIFY `deleted_at` TIMESTAMP NULL;

-- DropTable
DROP TABLE `contratos`;

-- DropTable
DROP TABLE `facturas`;

-- DropTable
DROP TABLE `radicados`;

-- CreateTable
CREATE TABLE `EPS` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(6) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX `EPS_codigo_key`(`codigo`),
    UNIQUE INDEX `EPS_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IPS` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(11) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX `IPS_codigo_key`(`codigo`),
    UNIQUE INDEX `IPS_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(25) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ejecuciones` (
    `id` VARCHAR(191) NOT NULL,
    `ips_id` INTEGER NOT NULL,
    `eps_id` INTEGER NOT NULL,
    `estado` INTEGER NOT NULL,
    `metadata` JSON NOT NULL,
    `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `finished_at` TIMESTAMP NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ejecuciones` ADD CONSTRAINT `ejecuciones_estado_fkey` FOREIGN KEY (`estado`) REFERENCES `estados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ejecuciones` ADD CONSTRAINT `ejecuciones_ips_id_fkey` FOREIGN KEY (`ips_id`) REFERENCES `IPS`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ejecuciones` ADD CONSTRAINT `ejecuciones_eps_id_fkey` FOREIGN KEY (`eps_id`) REFERENCES `EPS`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

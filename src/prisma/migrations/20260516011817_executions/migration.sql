/*
  Warnings:

  - You are about to drop the column `eps_id` on the `ejecuciones` table. All the data in the column will be lost.
  - You are about to drop the column `ips_id` on the `ejecuciones` table. All the data in the column will be lost.
  - You are about to alter the column `started_at` on the `ejecuciones` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `finished_at` on the `ejecuciones` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `created_at` on the `eps` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `created_at` on the `ips` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `created_at` on the `roles` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `updated_at` on the `roles` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `disabled_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `created_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `updated_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `deleted_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - Added the required column `eps_codigo` to the `ejecuciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ips_codigo` to the `ejecuciones` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ejecuciones` DROP FOREIGN KEY `ejecuciones_eps_id_fkey`;

-- DropForeignKey
ALTER TABLE `ejecuciones` DROP FOREIGN KEY `ejecuciones_ips_id_fkey`;

-- DropIndex
DROP INDEX `ejecuciones_eps_id_fkey` ON `ejecuciones`;

-- DropIndex
DROP INDEX `ejecuciones_ips_id_fkey` ON `ejecuciones`;

-- AlterTable
ALTER TABLE `ejecuciones` DROP COLUMN `eps_id`,
    DROP COLUMN `ips_id`,
    ADD COLUMN `eps_codigo` VARCHAR(191) NOT NULL,
    ADD COLUMN `ips_codigo` VARCHAR(191) NOT NULL,
    MODIFY `started_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `finished_at` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `eps` MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `ips` MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `roles` MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `disabled_at` TIMESTAMP NULL,
    MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` TIMESTAMP NULL,
    MODIFY `deleted_at` TIMESTAMP NULL;

-- AddForeignKey
ALTER TABLE `ejecuciones` ADD CONSTRAINT `ejecuciones_ips_codigo_fkey` FOREIGN KEY (`ips_codigo`) REFERENCES `IPS`(`codigo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ejecuciones` ADD CONSTRAINT `ejecuciones_eps_codigo_fkey` FOREIGN KEY (`eps_codigo`) REFERENCES `EPS`(`codigo`) ON DELETE RESTRICT ON UPDATE CASCADE;

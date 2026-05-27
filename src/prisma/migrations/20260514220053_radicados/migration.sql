/*
  Warnings:

  - You are about to drop the column `pre_radicado_id` on the `facturas` table. All the data in the column will be lost.
  - You are about to alter the column `created_at` on the `facturas` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `updated_at` on the `facturas` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to drop the column `codigo` on the `radicados` table. All the data in the column will be lost.
  - You are about to alter the column `created_at` on the `radicados` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `updated_at` on the `radicados` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `created_at` on the `roles` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `updated_at` on the `roles` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `disabled_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `created_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `updated_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `deleted_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - A unique constraint covering the columns `[codigo_preradicado]` on the table `radicados` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `radicado_id` to the `facturas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codigo_preradicado` to the `radicados` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `facturas` DROP FOREIGN KEY `facturas_pre_radicado_id_fkey`;

-- DropIndex
DROP INDEX `facturas_pre_radicado_id_fkey` ON `facturas`;

-- DropIndex
DROP INDEX `radicados_codigo_key` ON `radicados`;

-- AlterTable
ALTER TABLE `facturas` DROP COLUMN `pre_radicado_id`,
    ADD COLUMN `radicado_id` INTEGER NOT NULL,
    MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `radicados` DROP COLUMN `codigo`,
    ADD COLUMN `codigo_preradicado` VARCHAR(25) NOT NULL,
    MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `roles` MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `disabled_at` TIMESTAMP NULL,
    MODIFY `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` TIMESTAMP NULL,
    MODIFY `deleted_at` TIMESTAMP NULL;

-- CreateIndex
CREATE UNIQUE INDEX `radicados_codigo_preradicado_key` ON `radicados`(`codigo_preradicado`);

-- AddForeignKey
ALTER TABLE `facturas` ADD CONSTRAINT `facturas_radicado_id_fkey` FOREIGN KEY (`radicado_id`) REFERENCES `radicados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

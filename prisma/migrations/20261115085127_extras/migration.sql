-- CreateEnum
CREATE TYPE "ExtraPricing" AS ENUM ('PER_STAY', 'PER_NIGHT', 'PER_PERSON');

-- CreateTable
CREATE TABLE "Extra" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "pricing" "ExtraPricing" NOT NULL DEFAULT 'PER_STAY',
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtraTranslation" (
    "extraId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ExtraTranslation_pkey" PRIMARY KEY ("extraId","locale")
);

-- CreateTable
CREATE TABLE "ReservationExtra" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "extraId" TEXT,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,

    CONSTRAINT "ReservationExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ExtraToUnit" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ExtraToUnit_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "ReservationExtra_reservationId_idx" ON "ReservationExtra"("reservationId");

-- CreateIndex
CREATE INDEX "_ExtraToUnit_B_index" ON "_ExtraToUnit"("B");

-- AddForeignKey
ALTER TABLE "ExtraTranslation" ADD CONSTRAINT "ExtraTranslation_extraId_fkey" FOREIGN KEY ("extraId") REFERENCES "Extra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationExtra" ADD CONSTRAINT "ReservationExtra_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationExtra" ADD CONSTRAINT "ReservationExtra_extraId_fkey" FOREIGN KEY ("extraId") REFERENCES "Extra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExtraToUnit" ADD CONSTRAINT "_ExtraToUnit_A_fkey" FOREIGN KEY ("A") REFERENCES "Extra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExtraToUnit" ADD CONSTRAINT "_ExtraToUnit_B_fkey" FOREIGN KEY ("B") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

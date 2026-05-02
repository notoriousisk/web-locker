import { PrismaClient, LockerSize, LockerStatus } from '@prisma/client';

const prisma = new PrismaClient();

const lockers = [
  { code: 'A01', size: LockerSize.S, row: 1, column: 1 },
  { code: 'A02', size: LockerSize.S, row: 1, column: 2 },
  { code: 'A03', size: LockerSize.M, row: 1, column: 3 },
  { code: 'A04', size: LockerSize.M, row: 1, column: 4 },
  { code: 'B01', size: LockerSize.L, row: 2, column: 1 },
  { code: 'B02', size: LockerSize.L, row: 2, column: 2 },
  { code: 'B03', size: LockerSize.XL, row: 2, column: 3 },
  { code: 'B04', size: LockerSize.XL, row: 2, column: 4 }
];

async function main() {
  for (const locker of lockers) {
    await prisma.locker.upsert({
      where: { code: locker.code },
      update: {
        size: locker.size,
        row: locker.row,
        column: locker.column
      },
      create: {
        ...locker,
        status: LockerStatus.AVAILABLE
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';

// Prisma 클라이언트 싱글턴
const prisma = new PrismaClient();

export default prisma;

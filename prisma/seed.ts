/**
 * Optional seed: creates a demo account so you can sign in immediately.
 *   Email:    demo@portfolio.local
 *   Password: demo12345
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@portfolio.local";
  const passwordHash = await bcrypt.hash("demo12345", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      passwordHash,
      settings: { create: { baseCurrency: "GBP", priceInterval: "M15" } },
      watchlists: { create: { name: "My Watchlist", isDefault: true } },
    },
  });

  // A couple of sample holdings (manual source).
  const samples = [
    {
      symbol: "AAPL",
      yahooSymbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ",
      currency: "USD",
      quantity: 10,
      avgCost: 180,
    },
    {
      symbol: "0189.HK",
      yahooSymbol: "0189.HK",
      name: "Dongyue Group Limited",
      exchange: "HKEX",
      currency: "HKD",
      quantity: 4000,
      avgCost: 6.5,
    },
  ];

  for (const s of samples) {
    await prisma.holding.upsert({
      where: {
        userId_yahooSymbol_source: {
          userId: user.id,
          yahooSymbol: s.yahooSymbol,
          source: "MANUAL",
        },
      },
      update: {},
      create: { ...s, userId: user.id, source: "MANUAL" },
    });
  }

  console.info(`Seeded demo user: ${email} / demo12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

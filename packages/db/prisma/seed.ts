import { PrismaClient, TeamRole } from '@prisma/client';

// Local/staging fixture data only — never run against production (Doc 18 §9).
// Seeds just team_members for now; leads/websites/etc. get their own seed
// data alongside the modules that own them (Doc 21).
const prisma = new PrismaClient();

const FIXTURE_TEAM_MEMBERS: Array<{
  clerkUserId: string;
  name: string;
  email: string;
  role: TeamRole;
}> = [
  {
    clerkUserId: 'user_fixture_admin',
    name: 'Admin Fixture',
    email: 'admin@riznexia.dev',
    role: TeamRole.ADMIN,
  },
  {
    clerkUserId: 'user_fixture_manager',
    name: 'Manager Fixture',
    email: 'manager@riznexia.dev',
    role: TeamRole.MANAGER,
  },
  {
    clerkUserId: 'user_fixture_rep',
    name: 'Sales Rep Fixture',
    email: 'rep@riznexia.dev',
    role: TeamRole.SALES_REP,
  },
];

async function main(): Promise<void> {
  for (const member of FIXTURE_TEAM_MEMBERS) {
    await prisma.teamMember.upsert({
      where: { clerkUserId: member.clerkUserId },
      update: member,
      create: member,
    });
  }
  console.log(`Seeded ${FIXTURE_TEAM_MEMBERS.length} fixture team members.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

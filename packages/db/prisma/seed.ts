import { PipelineStage, PrismaClient, TeamRole, WebsiteStatusType } from '@prisma/client';

// Local/staging fixture data only — never run against production (Doc 18 §9).
// Websites/proposals/etc. get their own seed data alongside the modules
// that own them (Doc 21); Module M2 adds Business/Lead fixtures since both
// are now real, queryable tables rather than fields living only on Lead.
const prisma = new PrismaClient();

// One fixture per role (Module M3's six-role taxonomy) so local/staging
// always has a full spread to exercise RBAC against.
const FIXTURE_TEAM_MEMBERS: Array<{
  clerkUserId: string;
  name: string;
  email: string;
  role: TeamRole;
}> = [
  {
    clerkUserId: 'user_fixture_super_admin',
    name: 'Super Admin Fixture',
    email: 'super-admin@riznexia.dev',
    role: TeamRole.SUPER_ADMIN,
  },
  {
    clerkUserId: 'user_fixture_admin',
    name: 'Admin Fixture',
    email: 'admin@riznexia.dev',
    role: TeamRole.ADMIN,
  },
  {
    clerkUserId: 'user_fixture_sales_manager',
    name: 'Sales Manager Fixture',
    email: 'sales-manager@riznexia.dev',
    role: TeamRole.SALES_MANAGER,
  },
  {
    clerkUserId: 'user_fixture_developer',
    name: 'Developer Fixture',
    email: 'developer@riznexia.dev',
    role: TeamRole.DEVELOPER,
  },
  {
    clerkUserId: 'user_fixture_sales_executive',
    name: 'Sales Executive Fixture',
    email: 'sales-executive@riznexia.dev',
    role: TeamRole.SALES_EXECUTIVE,
  },
  {
    clerkUserId: 'user_fixture_viewer',
    name: 'Viewer Fixture',
    email: 'viewer@riznexia.dev',
    role: TeamRole.VIEWER,
  },
];

// One fixture Business per WebsiteStatusType, so local/staging always has a
// realistic spread to exercise discovery-refresh (FR-1.7) and pipeline UI
// states against. Only `none`/`outdated` businesses get a Lead — a
// `present` business was found but never qualified for pursuit, matching
// the DiscoveryRunnerService gating rule (see Doc 22 §5, apps/api/src/
// discovery/discovery-runner.service.ts).
const FIXTURE_BUSINESSES: Array<{
  googlePlaceId: string;
  businessName: string;
  category: string;
  city: string;
  address: string;
  websiteStatus: WebsiteStatusType;
  lead?: { pipelineStage: PipelineStage; tags?: string[]; note?: string };
}> = [
  {
    googlePlaceId: 'places_fixture_no_website',
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St, Karachi',
    websiteStatus: WebsiteStatusType.NONE,
    lead: { pipelineStage: PipelineStage.NEW, tags: ['inbound'] },
  },
  {
    googlePlaceId: 'places_fixture_outdated_website',
    businessName: 'Sunrise Bakery',
    category: 'bakery',
    city: 'Lahore',
    address: '45 Mall Rd, Lahore',
    websiteStatus: WebsiteStatusType.OUTDATED,
    lead: {
      pipelineStage: PipelineStage.CONTACTED,
      tags: ['priority', 'referral'],
      note: 'Owner interested, follow up Friday.',
    },
  },
  {
    googlePlaceId: 'places_fixture_has_website',
    businessName: 'Metro Fitness Club',
    category: 'gym',
    city: 'Islamabad',
    address: '9 Blue Area, Islamabad',
    websiteStatus: WebsiteStatusType.PRESENT,
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

  for (const fixture of FIXTURE_BUSINESSES) {
    const business = await prisma.business.upsert({
      where: { googlePlaceId: fixture.googlePlaceId },
      update: {
        businessName: fixture.businessName,
        category: fixture.category,
        city: fixture.city,
        address: fixture.address,
        websiteStatus: fixture.websiteStatus,
        placesData: { fixture: true, googlePlaceId: fixture.googlePlaceId },
      },
      create: {
        googlePlaceId: fixture.googlePlaceId,
        businessName: fixture.businessName,
        category: fixture.category,
        city: fixture.city,
        address: fixture.address,
        websiteStatus: fixture.websiteStatus,
        placesData: { fixture: true, googlePlaceId: fixture.googlePlaceId },
      },
    });

    if (fixture.lead) {
      const lead = await prisma.lead.upsert({
        where: { businessId: business.id },
        update: { pipelineStage: fixture.lead.pipelineStage, tags: fixture.lead.tags ?? [] },
        create: {
          businessId: business.id,
          pipelineStage: fixture.lead.pipelineStage,
          tags: fixture.lead.tags ?? [],
        },
      });

      // Module M4: notes are an append-only collection now, so seeding is
      // create-if-absent rather than an upsert on a column. Keyed on
      // (leadId, body) so re-running the seed doesn't stack duplicates.
      if (fixture.lead.note) {
        const existingNote = await prisma.leadNote.findFirst({
          where: { leadId: lead.id, body: fixture.lead.note },
        });
        if (!existingNote) {
          await prisma.leadNote.create({
            data: { leadId: lead.id, body: fixture.lead.note, authorId: null },
          });
        }
      }
    }
  }
  console.log(
    `Seeded ${FIXTURE_BUSINESSES.length} fixture businesses (${FIXTURE_BUSINESSES.filter((b) => b.lead).length} with a Lead).`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

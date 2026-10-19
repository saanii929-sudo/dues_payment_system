import { connectToDatabase } from "@/lib/db/connection";
import { Organization } from "@/models";

async function main() {
  await connectToDatabase();
  const orgs = await Organization.find({ isActive: true }).limit(5);
  for (const org of orgs) {
    console.log(org.slug, "-", org.name, "- logoUrl:", org.logoUrl ?? "(none)");
  }
  process.exit(0);
}

main();

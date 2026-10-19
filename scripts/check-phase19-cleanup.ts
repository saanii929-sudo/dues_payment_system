import { connectToDatabase } from "@/lib/db/connection";
import { Organization } from "@/models";

async function main() {
  await connectToDatabase();
  const orgs = await Organization.find({ name: /Phase(19|20|21|22|23)/ });
  console.log("leftover orgs:", orgs.length);
  process.exit(0);
}

main();

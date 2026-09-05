import "@/lib/serverOnly";
import type { Model } from "mongoose";

export async function setEntityActive(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  id: string,
  isActive: boolean,
  actorUserId: string,
): Promise<boolean> {
  const update = isActive
    ? { isActive: true, $unset: { deactivatedAt: "", deactivatedById: "" } }
    : { isActive: false, deactivatedAt: new Date(), deactivatedById: actorUserId };

  const updated = await model.findByIdAndUpdate(id, update);
  return Boolean(updated);
}

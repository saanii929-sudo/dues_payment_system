import "@/lib/serverOnly";
import { connectToDatabase } from "@/lib/db/connection";
import { UssdSession, AcademicLevel, StudentCategory } from "@/models";
import { getPublicOrganizationBySlug } from "./organization.service";
import { initiatePayment, PaymentError } from "./payment.service";

export interface UssdRequest {
  sessionId: string;
  phoneNumber: string;
  text: string;
}

export interface UssdResponse {
  continue: boolean;
  message: string;
}

const SESSION_TTL_MS = 5 * 60 * 1000;

type UssdStep = "INDEX_NUMBER" | "NAME" | "LEVEL" | "CATEGORY" | "CONFIRM";

interface UssdSessionData {
  indexNumber?: string;
  fullName?: string;
  academicLevelId?: string;
  studentCategoryId?: string;
  levelOptions?: { id: string; name: string }[];
  categoryOptions?: { id: string; name: string }[];
}

function menu(options: { name: string }[]): string {
  return options.map((option, index) => `${index + 1}. ${option.name}`).join("\n");
}


export async function handleUssdRequest(
  organizationSlug: string,
  request: UssdRequest,
  appBaseUrl: string,
): Promise<UssdResponse> {
  await connectToDatabase();

  const organization = await getPublicOrganizationBySlug(organizationSlug);
  if (!organization) {
    return { continue: false, message: "This organization is not accepting payments right now." };
  }

  const latestInput = request.text.split("*").filter(Boolean).pop() ?? "";

  let session = await UssdSession.findOne({ sessionId: request.sessionId });

  if (!session) {
    session = await UssdSession.create({
      organizationId: organization.organizationId,
      sessionId: request.sessionId,
      phoneNumber: request.phoneNumber,
      step: "INDEX_NUMBER",
      data: {},
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return {
      continue: true,
      message: `Welcome to ${organization.name} dues payment.\nEnter your index number:`,
    };
  }

  const step = session.step as UssdStep;
  const data = session.data as UssdSessionData;

  async function advance(nextStep: UssdStep, nextData: UssdSessionData): Promise<void> {
    session!.step = nextStep;
    session!.data = nextData;
    session!.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await session!.save();
  }

  async function end(message: string): Promise<UssdResponse> {
    await UssdSession.deleteOne({ _id: session!._id });
    return { continue: false, message };
  }

  switch (step) {
    case "INDEX_NUMBER": {
      if (!latestInput.trim()) {
        return { continue: true, message: "Enter your index number:" };
      }
      await advance("NAME", { ...data, indexNumber: latestInput.trim() });
      return { continue: true, message: "Enter your full name:" };
    }

    case "NAME": {
      if (!latestInput.trim()) {
        return { continue: true, message: "Enter your full name:" };
      }
      const levels = await AcademicLevel.find({
        organizationId: organization.organizationId,
        isActive: true,
      }).sort({ sortOrder: 1 });
      const levelOptions = levels.map((level) => ({ id: level._id.toString(), name: level.name }));
      if (levelOptions.length === 0) {
        return await end("No academic levels are configured yet. Please try again later.");
      }
      await advance("LEVEL", { ...data, fullName: latestInput.trim(), levelOptions });
      return { continue: true, message: `Select your academic level:\n${menu(levelOptions)}` };
    }

    case "LEVEL": {
      const levelOptions = data.levelOptions ?? [];
      const selected = levelOptions[Number(latestInput) - 1];
      if (!selected) {
        return { continue: true, message: `Invalid choice. Select your academic level:\n${menu(levelOptions)}` };
      }
      const categories = await StudentCategory.find({
        organizationId: organization.organizationId,
        isActive: true,
      }).sort({ sortOrder: 1 });
      const categoryOptions = categories.map((category) => ({
        id: category._id.toString(),
        name: category.name,
      }));
      if (categoryOptions.length === 0) {
        return await end("No student categories are configured yet. Please try again later.");
      }
      await advance("CATEGORY", { ...data, academicLevelId: selected.id, categoryOptions });
      return { continue: true, message: `Select your student category:\n${menu(categoryOptions)}` };
    }

    case "CATEGORY": {
      const categoryOptions = data.categoryOptions ?? [];
      const selected = categoryOptions[Number(latestInput) - 1];
      if (!selected) {
        return {
          continue: true,
          message: `Invalid choice. Select your student category:\n${menu(categoryOptions)}`,
        };
      }
      await advance("CONFIRM", { ...data, studentCategoryId: selected.id });
      return {
        continue: true,
        message: `Confirm payment for ${data.fullName} (${data.indexNumber}).\n1. Confirm and pay\n2. Cancel`,
      };
    }

    case "CONFIRM": {
      if (latestInput === "2") {
        return await end("Payment cancelled.");
      }
      if (latestInput !== "1") {
        return {
          continue: true,
          message: `Confirm payment for ${data.fullName} (${data.indexNumber}).\n1. Confirm and pay\n2. Cancel`,
        };
      }

      try {
        await initiatePayment(
          organizationSlug,
          {
            indexNumber: data.indexNumber ?? "",
            fullName: data.fullName ?? "",
            academicLevelId: data.academicLevelId ?? "",
            studentCategoryId: data.studentCategoryId ?? "",
            phone: request.phoneNumber,
          },
          { appBaseUrl },
        );
        return await end(
          "Thank you! Complete your payment via the mobile money prompt sent to your phone.",
        );
      } catch (error) {
        const message =
          error instanceof PaymentError ? error.message : "Something went wrong. Please try again later.";
        return await end(message);
      }
    }

    default:
      return await end("Session expired. Please try again.");
  }
}

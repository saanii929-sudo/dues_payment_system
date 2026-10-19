import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IUssdSession extends Document {
  organizationId: Types.ObjectId;
  sessionId: string;
  phoneNumber: string;
  step: string;
  data: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ussdSessionSchema = new Schema<IUssdSession>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    sessionId: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, trim: true },
    step: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

ussdSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UssdSession =
  models.UssdSession ?? model<IUssdSession>("UssdSession", ussdSessionSchema);

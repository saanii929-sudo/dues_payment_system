import { Schema, model, models, type Document, type Types } from "mongoose";
import type { NotificationChannel, NotificationStatus } from "./shared/types";

export interface INotification extends Document {
  organizationId?: Types.ObjectId;
  recipientUserId?: Types.ObjectId;
  recipientIndexNumber?: string;
  channel: NotificationChannel;
  type: string;
  payload?: unknown;
  status: NotificationStatus;
  sentAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User" },
    recipientIndexNumber: { type: String, trim: true },
    channel: { type: String, required: true, enum: ["EMAIL", "SMS"] },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
    },
    sentAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ recipientUserId: 1, createdAt: 1 });
notificationSchema.index({ organizationId: 1, createdAt: 1 });

export const Notification =
  models.Notification ?? model<INotification>("Notification", notificationSchema);

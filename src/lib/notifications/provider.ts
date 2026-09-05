export interface SendNotificationInput {
  channel: "EMAIL" | "SMS";
  to: string;
  subject: string;
  body: string;
}

export interface NotificationProvider {
  readonly name: string;
  send(input: SendNotificationInput): Promise<void>;
}

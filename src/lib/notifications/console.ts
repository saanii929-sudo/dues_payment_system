import type { NotificationProvider, SendNotificationInput } from "./provider";

class ConsoleNotificationProvider implements NotificationProvider {
  readonly name = "console";

  async send(input: SendNotificationInput): Promise<void> {
    console.log(
      `[notification:${input.channel}] to=${input.to} subject="${input.subject}"\n${input.body}`,
    );
  }
}

export const notificationProvider: NotificationProvider =
  new ConsoleNotificationProvider();

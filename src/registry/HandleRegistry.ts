import { EmailHandler } from "../handlers/emailHandler.js";
import { JobHandler } from "../handlers/jobHandler.js";

export class HandlerRegistry {
  private handlers: Map<string, JobHandler>;

  constructor() {
    this.handlers = new Map();

    this.handlers.set("email", new EmailHandler());
  }

  getHandler(type: string): JobHandler {
    const handler = this.handlers.get(type);

    if (!handler) {
      throw new Error(`No handler registered for job type: ${type}`);
    }

    return handler;
  }
}

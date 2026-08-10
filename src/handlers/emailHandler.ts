// handlers/EmailHandler.ts

import { Job } from "../types/job.js";
import { JobHandler } from "./jobHandler.js";

export class EmailHandler implements JobHandler {
  async handle(job: Job): Promise<void> {
    throw new Error("SMTP NOT WORKING");
  }
}

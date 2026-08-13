// handlers/EmailHandler.ts

import { Job } from "../types/job.js";
import { JobHandler } from "./jobHandler.js";

export class EmailHandler implements JobHandler {
  async handle(job: Job): Promise<void> {
    console.log(`📧 Processing job ${job.id}`);

    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });

    console.log(`✅ Finished job ${job.id}`);
  }
}

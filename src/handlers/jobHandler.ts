// handlers/JobHandler.ts

import { Job } from "../types/job.js";

export interface JobHandler {
  handle(job: Job): Promise<void>;
}

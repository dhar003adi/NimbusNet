import { redisClient } from "../redis/client.js";
import { Job } from "../types/job.js";

export class DeadLetterRecovery {
  async add(job: Job, reason: String): Promise<void> {
    const failedJob = {
      ...job,
      failedAt: new Date(),
      reason,
    };

    await redisClient.lPush("dead-letter-jobs", JSON.stringify(failedJob));

    console.log(`job ${job.id} moved to dead letter queue`);
  }
}

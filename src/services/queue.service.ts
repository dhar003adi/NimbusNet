import crypto from "node:crypto";
import { redisClient } from "../redis/client.js";
import { Job } from "../types/job.js";

export class QueueService {
  async createJob(
    type: string,
    payload: Record<string, unknown>,
  ): Promise<Job> {
    const job: Job = {
      id: crypto.randomUUID(),
      type,
      payload,
      status: "queued",
      createdAt: new Date(),
      retryCount: 0,
    };

    await redisClient.lPush("jobs", JSON.stringify(job));

    return job;
  }
}

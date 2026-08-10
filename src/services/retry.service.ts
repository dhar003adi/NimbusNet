import { redisClient } from "../redis/client.js";
import { Job } from "../types/job.js";

const MAX_RETRIES = 5;

export class retryServices {
  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async retry(job: Job): Promise<boolean> {
    job.retryCount++;

    if (job.retryCount > MAX_RETRIES) {
      return false;
    }

    const delay = Math.pow(2, job.retryCount - 1) * 1000;

    console.log(`Retrying in ${delay / 1000} seconds...`);

    await this.sleep(delay);

    await redisClient.lPush("jobs", JSON.stringify(job));

    return true;
  }
}

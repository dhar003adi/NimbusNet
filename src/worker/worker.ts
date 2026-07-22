import { redisClient } from "../redis/client.js";
import { Job } from "../types/job.js";

async function startWorker() {
  await redisClient.connect();

  console.log("🚀 Worker Started...");

  while (true) {
    const result = await redisClient.brPop("jobs", 0);

    if (!result) continue;

    const job: Job = JSON.parse(result.element);

    console.log(job);
  }
}

startWorker();

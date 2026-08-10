import { redisClient } from "../redis/client.js";
import { HandlerRegistry } from "../registry/HandleRegistry.js";
import { Job } from "../types/job.js";
import { retryServices } from "../services/retry.service.js";
import { DeadLetterRecovery } from "../services/deadLetterRecovery.service.js";

async function startWorker() {
  await redisClient.connect();

  console.log(" Worker Started...");

  const registry = new HandlerRegistry();

  while (true) {
    const result = await redisClient.brPop("jobs", 0);

    if (!result) continue;

    const job: Job = JSON.parse(result.element);

    const retry = new retryServices();

    try {
      const handler = registry.getHandler(job.type);

      await handler.handle(job);

      console.log(`✅ Job ${job.id} processed successfully`);
    } catch (error) {
      console.error(` Failed to process job ${job.id}:`, error);

      //RETRY LOGIC

      const retried = await retry.retry(job);

      const deadJob = new DeadLetterRecovery();

      if (!retried) {
        //DLR

        await deadJob.add(
          job,
          error instanceof Error ? error.message : "Unknown Error",
        );
      }
    }
  }
}

startWorker().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});

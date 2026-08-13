import { redisClient } from "../redis/client.js";
import { HandlerRegistry } from "../registry/HandleRegistry.js";
import { Job } from "../types/job.js";
import { retryServices } from "../services/retry.service.js";
import { DeadLetterRecovery } from "../services/deadLetterRecovery.service.js";
let isShuttingDown = false;
async function startWorker() {
  await redisClient.connect();

  console.log(" Worker Started...");

  const registry = new HandlerRegistry();

  const retry = new retryServices();

  const deadJob = new DeadLetterRecovery();

  while (!isShuttingDown) {
    const result = await redisClient.brPop("jobs", 1);

    if (!result) continue;

    const job: Job = JSON.parse(result.element);

    try {
      const handler = registry.getHandler(job.type);

      await handler.handle(job);

      console.log(`✅ Job ${job.id} processed successfully`);
    } catch (error) {
      console.error(` Failed to process job ${job.id}:`, error);

      //RETRY LOGIC

      const retried = await retry.retry(job);

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

process.on("SIGINT", async () => {
  console.log("🛑 Shutting down worker...");

  await redisClient.quit();

  console.log("🔌 Redis connection closed");
  isShuttingDown = true;

  process.exit(0);
});

startWorker().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});

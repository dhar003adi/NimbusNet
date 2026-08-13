import { redisClient } from "../redis/client.js";

async function startScheduler() {
  await redisClient.connect();

  console.log(" Scheduler Started...");

  while (true) {
    const now = Date.now();

    const jobs = await redisClient.zRangeByScore("retry-jobs", 0, now);

    for (const job of jobs) {
      await redisClient.lPush("jobs", job);

      await redisClient.zRem("retry-jobs", job);

      console.log("🔄 Job moved back to main queue");
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }
}

startScheduler().catch((error) => {
  console.error("Scheduler failed:", error);
  process.exit(1);
});

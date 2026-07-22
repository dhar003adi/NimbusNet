import express from "express";
import jobRoutes from "./api/routes/job.routes.js";
import { redisClient } from "./redis/client.js";

const app = express();

app.use(express.json());

app.get("/", (_, res) => {
  res.send("NimbusNet Running 🚀");
});

// Register Job Routes
app.use("/api/jobs", jobRoutes);

const PORT = 3000;

async function bootstrap() {
  await redisClient.connect();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap();

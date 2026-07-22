import { Request, Response } from "express";
import { QueueService } from "../../services/queue.service.js";

const queueService = new QueueService();

export const createJob = async (req: Request, res: Response) => {
  const { type, payload } = req.body;

  const job = queueService.createJob(type, payload);

  return res.status(201).json(job);
};

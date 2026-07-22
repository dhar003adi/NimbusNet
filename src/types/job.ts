export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: "queued";
  createdAt: Date;
}

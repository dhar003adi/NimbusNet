# NimbusNet

**Reliable Job Queue with Dead Letter Recovery**

NimbusNet is a Redis-based background job queue built with **Node.js, TypeScript, and Express**.

The project focuses on reliable asynchronous job processing with automatic retries, exponential backoff, scheduled retry handling, dead-letter recovery, multiple workers, and graceful shutdown.

---

## Features

- Redis-backed job queue
- REST API for creating jobs
- Background worker for processing jobs
- Handler registry for different job types
- Automatic job retries
- Maximum retry limit
- Exponential backoff between retries
- Scheduled retry processing using Redis Sorted Sets
- Dead Letter Queue (DLQ)
- Multiple worker support
- Graceful worker shutdown
- Separate scheduler process
- Docker-based Redis setup

---

## Tech Stack

- **Node.js**
- **TypeScript**
- **Express.js**
- **Redis**
- **Docker**

---

# Architecture

NimbusNet consists of three main processes:

```text
                    ┌──────────────────┐
                    │      Client      │
                    └────────┬─────────┘
                             │
                             │ POST /api/jobs
                             ▼
                    ┌──────────────────┐
                    │   Express API    │
                    │     Producer     │
                    └────────┬─────────┘
                             │
                             │ Add Job
                             ▼
                    ┌──────────────────┐
                    │      Redis       │
                    │                  │
                    │   jobs queue     │
                    │   retry-jobs     │
                    │   DLQ            │
                    └───────┬──────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
        ┌────────────────┐    ┌────────────────┐
        │     Worker     │    │    Scheduler   │
        │                │    │                │
        │ Process Jobs   │    │ Check Retries  │
        └───────┬────────┘    └───────┬────────┘
                │                     │
                │                     │
                ▼                     │
        ┌────────────────┐            │
        │ Handler        │            │
        │ Registry       │            │
        └───────┬────────┘            │
                │                     │
         ┌──────┴──────┐              │
         │             │              │
      Success       Failure           │
         │             │              │
         ▼             ▼              │
     Completed       Retry ───────────┘
                       │
                       │ Max retries
                       ▼
                 Dead Letter Queue
```

---

# How It Works

A job goes through the following lifecycle:

```text
Created
   ↓
Queued
   ↓
Processing
   │
   ├── Success ──────────→ Completed
   │
   └── Failure
         ↓
       Retry
         ↓
   Scheduled Retry
         ↓
      Processing
         │
         ├── Success → Completed
         │
         └── Failure
                ↓
             Retry
                ↓
             ...
                ↓
       Maximum Retries Reached
                ↓
              DLQ
```

---

# 1. Job Creation

A client creates a job through the Express API.

### Endpoint

```http
POST /api/jobs
```

### Request Body

```json
{
  "type": "email",
  "payload": {
    "to": "user@example.com",
    "subject": "Welcome"
  }
}
```

The important fields are:

| Field     | Description                                     |
| --------- | ----------------------------------------------- |
| `type`    | Identifies which handler should process the job |
| `payload` | Data required by the handler                    |

The API acts as the **producer**.

Once the request is received, the job is pushed into the Redis queue.

---

# 2. Redis Queue

Redis is used as the queue backend.

The main queue is represented by:

```text
jobs
```

Jobs waiting to be processed are stored here.

A worker consumes jobs from this queue.

---

# 3. Handler Registry

NimbusNet uses a handler registry to determine how different job types should be processed.

For example:

```text
Job Type
   ↓
"email"
   ↓
Email Handler
```

This allows the queue system to remain independent of the actual business logic.

The queue is responsible for:

- Receiving jobs
- Delivering jobs
- Retrying jobs
- Handling failures
- Moving failed jobs to the DLQ

The registered handler is responsible for actually processing the job.

---

# 4. Worker

The worker is responsible for consuming jobs from Redis and executing their registered handlers.

Start a worker using:

```bash
npm run worker
```

The worker continuously waits for jobs.

When a job is available:

```text
Redis
  ↓
Worker
  ↓
Handler Registry
  ↓
Job Handler
```

If the handler succeeds, the job is completed.

If the handler throws an error, the retry mechanism is triggered.

---

# 5. Retry Mechanism

NimbusNet does not immediately move a failed job to the Dead Letter Queue.

Instead, failed jobs are retried.

The system supports a maximum of **5 retry attempts**.

The retry delay uses exponential backoff:

```text
Retry 1 → 1 second
Retry 2 → 2 seconds
Retry 3 → 4 seconds
Retry 4 → 8 seconds
Retry 5 → 16 seconds
```

In simplified form:

```text
delay = 2^(retryCount - 1)
```

This prevents the system from continuously retrying a failed job immediately.

---

# 6. Scheduled Retries

Retries are not simply placed back into the main queue immediately.

NimbusNet uses a Redis **Sorted Set** to schedule retries.

The retry jobs are stored in:

```text
retry-jobs
```

The job's scheduled execution time is used as the Sorted Set score.

Conceptually:

```text
retry-jobs

Job A → timestamp
Job B → timestamp
Job C → timestamp
```

The scheduler checks the Sorted Set for jobs whose retry time has arrived.

---

# 7. Scheduler

The scheduler is a separate process responsible for handling scheduled retries.

Start it with:

```bash
npm run scheduler
```

Its responsibility is:

```text
retry-jobs
     ↓
Check scheduled time
     ↓
Retry time reached?
     ↓
    Yes
     ↓
Move job back to
main queue
```

This separates retry scheduling from the workers themselves.

---

# 8. Dead Letter Queue

If a job continues to fail after the maximum number of retries, it is moved to the **Dead Letter Queue**.

The DLQ is represented by:

```text
dead-letter-jobs
```

The lifecycle becomes:

```text
Job
 ↓
Attempt 1 → Failed
 ↓
Attempt 2 → Failed
 ↓
Attempt 3 → Failed
 ↓
Attempt 4 → Failed
 ↓
Attempt 5 → Failed
 ↓
Dead Letter Queue
```

Instead of endlessly retrying the job, NimbusNet preserves it in the DLQ.

This makes permanently failing jobs easier to inspect and recover.

---

# Redis Data Structures

NimbusNet currently uses the following Redis structures:

| Redis Key          | Purpose                           |
| ------------------ | --------------------------------- |
| `jobs`             | Main job queue                    |
| `retry-jobs`       | Scheduled retry jobs              |
| `dead-letter-jobs` | Jobs that exhausted their retries |

You can inspect them directly using Redis CLI.

---

# Running Locally

## Prerequisites

Install:

- Node.js 20+
- npm
- Docker

Check Node.js:

```bash
node --version
```

Check npm:

```bash
npm --version
```

Check Docker:

```bash
docker --version
```

---

# Installation

Clone the repository:

```bash
git clone https://github.com/dhar003adi/NimbusNet.git
```

Enter the project:

```bash
cd NimbusNet
```

Install dependencies:

```bash
npm install
```

---

# Start Redis

NimbusNet uses Redis as its queue backend.

Start a Redis container:

```bash
docker run -d --name nimbus-redis -p 6379:6379 redis
```

Verify that the container is running:

```bash
docker ps
```

You should see:

```text
nimbus-redis
```

---

# Access Redis CLI

To enter the Redis CLI:

```bash
docker exec -it nimbus-redis redis-cli
```

Test the connection:

```redis
PING
```

Expected output:

```text
PONG
```

Exit:

```redis
exit
```

---

# Running the Application

NimbusNet uses separate processes for the API, workers, and scheduler.

You should run the following processes separately.

## 1. Start the API

```bash
npm run dev
```

The API runs on:

```text
http://localhost:3000
```

---

## 2. Start the Worker

In another terminal:

```bash
npm run worker
```

The worker will start consuming jobs from Redis.

---

## 3. Start the Scheduler

In another terminal:

```bash
npm run scheduler
```

The scheduler handles jobs waiting for their retry time.

---

# Complete Local Setup

You should have three application terminals running:

### Terminal 1 — API

```bash
npm run dev
```

### Terminal 2 — Worker

```bash
npm run worker
```

### Terminal 3 — Scheduler

```bash
npm run scheduler
```

And Redis running through Docker:

```bash
docker ps
```

---

# Creating a Job

Use Postman, Thunder Client, curl, or another API client.

### Request

```http
POST http://localhost:3000/api/jobs
```

### Body

```json
{
  "type": "email",
  "payload": {
    "to": "user@example.com",
    "subject": "Hello"
  }
}
```

The API will add the job to Redis.

The worker will then pick it up and process it through the appropriate handler.

---

# Testing the Queue

After starting Redis, the API, worker, and scheduler:

1. Send a `POST /api/jobs` request.
2. Confirm that the API accepts the job.
3. Check the worker terminal.
4. Verify that the worker picks up the job.
5. Verify that the registered handler processes it.

The basic flow should be:

```text
POST /api/jobs
      ↓
Redis
      ↓
Worker
      ↓
Handler
      ↓
Success
```

---

# Testing Retries

To test retries, use a job that causes its handler to fail.

The expected behavior is:

```text
Job Created
     ↓
Worker picks job
     ↓
Handler fails
     ↓
Retry scheduled
     ↓
Scheduler waits
     ↓
Retry time reached
     ↓
Job returned to queue
     ↓
Worker processes again
```

The retry delays should follow:

```text
1s → 2s → 4s → 8s → 16s
```

---

# Testing the Dead Letter Queue

To test the DLQ, use a job that consistently fails.

After the maximum retry attempts are exhausted:

```text
Job
 ↓
Failure
 ↓
Retry
 ↓
Failure
 ↓
Retry
 ↓
...
 ↓
Maximum retries reached
 ↓
DLQ
```

The job should eventually appear in:

```text
dead-letter-jobs
```

---

# Inspecting Redis

Enter Redis CLI:

```bash
docker exec -it nimbus-redis redis-cli
```

## Inspect Main Queue

```redis
LRANGE jobs 0 -1
```

---

## Inspect Retry Jobs

Because retry jobs are stored in a Sorted Set:

```redis
ZRANGE retry-jobs 0 -1 WITHSCORES
```

The scores represent the scheduled retry timestamps.

---

## Inspect Dead Letter Queue

```redis
LRANGE dead-letter-jobs 0 -1
```

---

# Multiple Workers

NimbusNet supports running multiple worker processes.

For example:

```text
              Redis
                │
        ┌───────┼───────┐
        │       │       │
        ▼       ▼       ▼
     Worker 1 Worker 2 Worker 3
```

Each worker can consume jobs from the same Redis queue.

This allows multiple jobs to be processed concurrently.

For example, open multiple terminals and run:

```bash
npm run worker
```

in each one.

---

# Graceful Shutdown

Workers support graceful shutdown.

When a worker receives a termination signal, it can stop accepting new work and shut down cleanly instead of abruptly terminating the process.

For local testing, you can stop a worker using:

```text
Ctrl + C
```

This is important for preventing jobs from being interrupted unnecessarily during shutdown.

---

# Docker Commands

## Start Redis

```bash
docker run -d --name nimbus-redis -p 6379:6379 redis
```

## Check Containers

```bash
docker ps
```

## Stop Redis

```bash
docker stop nimbus-redis
```

## Start Redis Again

```bash
docker start nimbus-redis
```

## Remove Redis Container

```bash
docker rm -f nimbus-redis
```

---

# Troubleshooting

## Redis Connection Error

Check whether the container is running:

```bash
docker ps
```

If `nimbus-redis` is not running:

```bash
docker start nimbus-redis
```

If the container does not exist:

```bash
docker run -d --name nimbus-redis -p 6379:6379 redis
```

---

## Check Redis Connectivity

```bash
docker exec -it nimbus-redis redis-cli ping
```

Expected:

```text
PONG
```

---

## Check Redis Port

Redis should be available on:

```text
localhost:6379
```

---

# Project Scripts

The important npm scripts are:

```bash
npm run dev
```

Starts the API in development mode.

```bash
npm run worker
```

Starts a worker process.

```bash
npm run scheduler
```

Starts the retry scheduler.

---

# Project Goals

NimbusNet was built to understand and implement practical backend concepts around reliable background processing.

The main concepts demonstrated by the project are:

- Job queues
- Producers and consumers
- Redis
- Worker processes
- Handler registries
- Retry mechanisms
- Exponential backoff
- Scheduled retries
- Redis Sorted Sets
- Dead Letter Queues
- Multiple workers
- Graceful shutdown
- Docker-based local infrastructure

---

# Current Scope

NimbusNet currently focuses on the core reliable queue workflow:

```text
Producer
   ↓
Redis Queue
   ↓
Worker
   ↓
Handler
   ↓
Success / Failure
   ↓
Retry
   ↓
Scheduled Retry
   ↓
DLQ
```

Features such as advanced metrics and monitoring are outside the current implemented scope.

---

# Repository

GitHub:

https://github.com/dhar003adi/NimbusNet

---

# Author

**Aditya Dhar**

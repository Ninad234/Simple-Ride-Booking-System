# Mini Uber Ride Assignment System

A simplified backend implementation of the ride assignment workflow used by ride-hailing platforms like Uber and Ola.

This project demonstrates **asynchronous job processing, driver assignment, message queues, event-driven architecture, independent event consumers, and concurrent ride booking**.

Built using Node.js, Express.js, MongoDB, Redis, BullMQ, and Docker.

## Features

### 1. Asynchronous Ride Booking
- REST API: `POST /rides`
- Generates and returns a unique `rideId` immediately.
- Adds ride requests to a background processing queue.
- Uses BullMQ and Redis for asynchronous job processing.

### 2. Automatic Driver Assignment
- Uses 10 predefined fake drivers.
- Simulates driver responses with a 50% acceptance probability.
- Assigns a ride when a driver accepts.
- Offers rejected rides to the next driver.
- Stops after 3 rejections.
- Updates ride status to `ASSIGNED` or `NO_DRIVER_FOUND`.
- Prevents multiple drivers from being assigned to the same ride.

### 3. Event-Driven Architecture
Publishes an event whenever a ride's status changes:

- `REQUESTED`
- `ASSIGNED`
- `NO_DRIVER_FOUND`

Uses Redis Streams with two independent consumer groups.

**Billing Consumer**
- Receives every ride event.
- Prints a charging message when a ride is successfully assigned.

**Operations Consumer**
- Receives every ride event.
- Prints every ride status update.

Both consumers independently receive the complete event stream.

### 4. Concurrent Ride Testing
- Sends 100 ride booking requests concurrently.
- Waits for background processing to finish.
- Checks final ride statuses.
- Detects multiple driver assignments.
- Identifies rides without a final status.
- Generates a terminal report.

### 5. Docker Support
- Containerized backend.
- MongoDB and Redis services.
- Separate containers for API, worker, billing, and operations.
- Docker Compose for running the complete application.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | REST API |
| MongoDB | Ride data storage |
| Mongoose | MongoDB ODM |
| Redis | Queue and event storage |
| BullMQ | Background job processing |
| ioredis | Redis communication |
| Docker | Application containerization |
| Docker Compose | Multi-container management |

---

## Project Architecture

```text
                 RIDER
                   |
                   |
              POST /rides
                   |
                   v
             EXPRESS API
                   |
          +--------+--------+
          |                 |
          v                 v
       MongoDB           Redis
       (Ride Data)       (BullMQ Queue)
                            |
                            v
                     RIDE WORKER
                            |
                     Fake Drivers
                       (10 Drivers)
                            |
                 +----------+----------+
                 |                     |
                 v                     v
              ASSIGNED           NO_DRIVER_FOUND
                 |                     |
                 +----------+----------+
                            |
                            v
                     REDIS STREAM
                      rideEvents
                            |
                +-----------+-----------+
                |                       |
                v                       v
          BILLING GROUP           OPERATIONS GROUP
                |                       |
                v                       v
          Billing Program        Operations Program
```

---

## Prerequisites

### Option 1: Docker (Recommended)

Install:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)
- [Postman](https://www.postman.com/) (optional, for API testing)

Docker Desktop includes Docker Compose.

### Option 2: Local Development

Install:

- [Node.js](https://nodejs.org/) (22 LTS recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) or MongoDB Atlas
- [Redis](https://redis.io/)
- npm

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/mini-uber-ride-assignment.git
```

Navigate into the project:

```bash
cd mini-uber-ride-assignment
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root.

```env
PORT=5000

MONGO_URI=mongodb://127.0.0.1:27017/uber_clone

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

For MongoDB Atlas, replace the local MongoDB URI with your Atlas connection string.

### 4. Start MongoDB and Redis

Make sure both services are running before starting the application.

### 5. Start the backend API

```bash
npm run dev
```

### 6. Start the background worker

Open another terminal:

```bash
npm run worker
```

### 7. Start the Billing consumer

```bash
npm run billing
```

### 8. Start the Operations consumer

```bash
npm run operations
```

The application is now ready to process ride requests.

---

## API Documentation

### Book a Ride

**Endpoint**

```http
POST /rides
```

**Base URL**

```text
http://localhost:5000
```

**Request Body**

```json
{
  "riderId": "R001",
  "pickup": "Panvel",
  "destination": "Vashi"
}
```

**Successful Response**

HTTP Status: `202 Accepted`

```json
{
  "message": "Ride booked successfully",
  "rideId": "GENERATED_RIDE_ID",
  "status": "REQUESTED"
}
```

The API returns the ride ID immediately without waiting for driver assignment.

### Ride Statuses

| Status | Description |
|---|---|
| REQUESTED | Ride has been booked |
| ASSIGNED | A driver has accepted |
| NO_DRIVER_FOUND | Three drivers have rejected |

---

## Docker Setup

Docker Compose runs the entire application using separate containers.

### 1. Build Docker images

```bash
docker compose build
```

### 2. Start all services

```bash
docker compose up --build -d
```

### 3. Check running containers

```bash
docker compose ps
```

### 4. View API logs

```bash
docker compose logs -f api
```

### 5. View worker logs

```bash
docker compose logs -f worker
```

### 6. View Billing logs

```bash
docker compose logs -f billing
```

### 7. View Operations logs

```bash
docker compose logs -f operations
```

### 8. Stop all services

```bash
docker compose down
```

To remove containers and their persisted database/Redis volumes:

```bash
docker compose down -v
```

**Warning:** The second command deletes the Docker volumes and their stored data.

---

## Testing

### Test an individual ride

Use Postman or curl:

```bash
curl -X POST http://localhost:5000/rides \
-H "Content-Type: application/json" \
-d "{\"riderId\":\"R001\",\"pickup\":\"Panvel\",\"destination\":\"Vashi\"}"
```

Check the API, worker, Billing, and Operations terminal logs.

### Test 100 concurrent rides

Run:

```bash
npm run test:rides
```

If using Docker, run:

```bash
docker compose exec api npm run test:rides
```

The test script sends 100 concurrent ride requests and waits for their final processing results.

### Expected Verification

| Test | Expected Result |
|---|---:|
| Total rides created | 100 |
| ASSIGNED + NO_DRIVER_FOUND | 100 |
| Rides assigned to multiple drivers | 0 |
| Rides without final status | 0 |

The actual split between assigned rides and unsuccessful rides is random.

### Example Terminal Report

```text
========== FINAL RIDE REPORT ==========

Total rides created:                 100
Assigned rides:                       86
No driver found:                      14
Assigned + No Driver Found:          100
Rides assigned to 2 drivers:           0
Rides without final status:            0

=======================================

ALL TESTS PASSED
```

*The numbers above are illustrative. Actual results depend on random driver responses.*

---

## Available NPM Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start Express API |
| `npm start` | Start API |
| `npm run worker` | Start ride assignment worker |
| `npm run billing` | Start Billing consumer |
| `npm run operations` | Start Operations consumer |
| `npm run test:rides` | Test 100 concurrent rides |

---

## Environment Variables

| Variable | Description |
|---|---|
| PORT | Express server port |
| MONGO_URI | MongoDB connection URI |
| REDIS_HOST | Redis hostname |
| REDIS_PORT | Redis port |
| REDIS_PASSWORD | Redis authentication password |

Never commit your actual `.env` file or database credentials.

---

## Learning Outcomes

This project demonstrates practical backend engineering concepts:

- REST API development
- Asynchronous processing
- Job queues and background workers
- Redis and BullMQ
- Event-driven architecture
- Redis Streams and consumer groups
- Independent event consumers
- MongoDB data modelling
- Concurrent request handling
- Race-condition prevention through conditional database updates
- Docker and Docker Compose
- Backend testing and verification

---

## Future Improvements

- Real driver and rider authentication.
- Driver location tracking.
- Geospatial driver matching.
- Real-time ride updates using WebSockets.
- Payment gateway integration.
- Retry and dead-letter queue handling.
- Transactional outbox for reliable event publishing.
- Improved worker recovery and monitoring.

---

## Author

**Ninad Gawade**

GitHub: https://github.com/Ninad234

---

*This project is an educational backend implementation designed to demonstrate ride assignment, background job processing, and event-driven architecture. It is not a production-ready ride-hailing platform.*

# Scalable Event Ticket Booking System

A containerized distributed application built using Node.js, Express, Redis, Docker, and Kubernetes. The project demonstrates distributed systems concepts through a seat-booking application.

## Project Overview

The system allows users to book seats while preventing duplicate bookings. It uses microservices, Redis-based coordination, and Kubernetes orchestration to demonstrate scalability and fault tolerance.

## Architecture

The application consists of the following components:

- **API Gateway** — Single entry point that routes client requests to backend services.
- **Booking Service** — Handles booking requests and coordinates seat reservations.
- **Inventory Service** — Maintains seat availability and prevents duplicate reservations.
- **Notification Service** — Receives booking events through Redis Pub/Sub and stores recent confirmations.
- **Redis** — Shared in-memory store used for seat state, distributed locks, and notifications.

## Technology Stack

- Node.js 20
- Express.js
- Redis
- Docker
- Docker Compose
- Kubernetes
- REST APIs
- HTML, CSS, and JavaScript

## Distributed Systems Concepts

- **Microservices Architecture:** Separates application responsibilities into independent services.
- **Middleware:** Uses an API Gateway to route requests and hide backend service details.
- **Mutual Exclusion:** Uses Redis locks to coordinate concurrent booking attempts.
- **Atomic Operations:** Uses Redis set operations to prevent duplicate seat reservations.
- **Logical Clocks:** Uses Lamport logical clocks to track event ordering.
- **Asynchronous Communication:** Uses Redis Pub/Sub for booking notifications.
- **Scalability:** Scales Booking Service replicas using Kubernetes.
- **Fault Tolerance:** Uses Kubernetes Deployments and readiness probes to recover from Pod failures.
- **Containerization and Orchestration:** Packages services in Docker containers and manages them using Kubernetes.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check service health |
| GET | `/api/seats` | View seat availability |
| POST | `/api/book/:seatId` | Book a seat |
| GET | `/api/notifications` | View recent notifications |
| POST | `/api/reset` | Reset seats for demonstration |

### Example Responses

- `200 OK` — Booking successful
- `409 Conflict` — Seat already booked
- `423 Locked` — Seat is temporarily locked
- `503 Service Unavailable` — Backend service unavailable

## Running the Project

### Prerequisites

Install Docker Desktop with Kubernetes enabled, Node.js 20 or later, and Git.

### Run with Docker Compose

From the project root, run:

```bash
docker compose up --build
```

If your project uses a differently named Compose file, specify that filename. Ensure Docker Desktop is running.

### Run with Kubernetes

After building and tagging the service images according to your project configuration, apply the Kubernetes manifests:

```bash
kubectl apply -f k8s/
kubectl get pods
kubectl get services
```

The Kubernetes manifest directory and image names must match your repository's actual configuration.

## Scalability Experiment

The Booking Service was tested with different replica counts under a simulated CPU workload.

| Booking Replicas | Throughput (requests/sec) | Average Latency |
|---:|---:|---:|
| 1 | 8.31 | 853 ms |
| 3 | 43.9 | 225 ms |
| 5 | 98.5 | 101 ms |

These measurements were obtained on a local development machine and illustrate the observed scaling trend under the test conditions. They are not production performance benchmarks.

## Fault Tolerance Demonstration

During testing, a Booking Service Pod was deleted manually. Kubernetes recreated the Pod, demonstrating Deployment-based recovery.

## Limitations

- Runs on a single-node local Kubernetes cluster.
- Redis is a single point of failure in the current setup.
- Authentication, payment processing, and production persistence are not implemented.
- Performance measurements depend on local hardware and workload.

## Future Enhancements

- Deploy to a multi-node or cloud Kubernetes cluster.
- Add persistent and highly available data storage.
- Implement authentication and payment integration.
- Add monitoring, retries, timeouts, and circuit breakers.
- Improve notification delivery with a consumer-group-based messaging system.

## Academic Project

Developed as a Distributed Systems project at PCCOE, Pune, to demonstrate microservices, distributed coordination, containerization, and orchestration.

---

**Repository:** https://github.com/Arman-19dsa/scalable-event-ticket-booking

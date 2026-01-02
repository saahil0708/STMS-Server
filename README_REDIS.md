# Redis Setup for STMS Server

We have implemented Redis caching to improve performance for student data retrieval.

## The Problem
You are seeing `ECONNREFUSED` because you have installed the **Client** (the code that talks to Redis) but not the **Server** (the actual database). You need to have a Redis server running for your code to connect to.

## Solution 1: Use Redis Cloud (Easiest - No Installation)
If you don't want to install anything on your computer, you can use a free cloud database.

1. Go to [Redis.com/try-free](https://redis.com/try-free/)
2. Sign up/Log in.
3. Create a **New Subscription** (select the Free tier).
4. Create a **New Structure** (Database).
5. Once created, you will see a **Public Endpoint** (e.g., `redis-12345.c1.us-central1.gce.cloud.redislabs.com:12345`) and a **Password**.
6. **Update your code**:
   - Creating a `.env` variable is best. Add `REDIS_URL=redis://:<password>@<endpoint>` to your `.env` file.
   - OR verify your `src/Config/Redis.js` uses this URL.

## Solution 2: Install on Windows (Developer Friendly)
If you want to run it locally (better for offline development):

### Option A: Memurai (Native Windows)
1. Go to [Memurai.com](https://www.memurai.com/get-memurai).
2. Download "Memurai Developer".
3. Install and run it. It works exactly like Redis.

### Option B: WSL (Windows Subsystem for Linux)
1. Open your WSL terminal (Ubuntu).
2. Run: `sudo apt-get install redis-server`
3. Start Redis: `sudo service redis-server start`

## Verifying Installation
Once you have either a Cloud URL or a Local Server running:
1. If using Cloud, make sure you updated your `.env` or config.
2. Restart your server: `npm run dev`
3. You should see: `Connected to Redis Cache!`

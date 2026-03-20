import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "child_process";

export default async function setup() {
  // Start in-memory MongoDB
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  process.env.MONGO_URL = uri;
  process.env.PORT = "6060";
  process.env.DEV_MODE = "test";
  process.env.JWT_SECRET = "playwright-test-secret";

  (global as any).__MONGOD__ = mongod;

  const server = spawn("node", ["server.js"], {
    env: { ...process.env },
    stdio: "pipe",
  });

  (global as any).__SERVER__ = server;

  server.stdout?.on("data", (data: Buffer) => {
    console.log("[server]", data.toString());
  });

  server.stderr?.on("data", (data: Buffer) => {
    console.error("[server error]", data.toString());
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Backend server failed to start within 15s"));
    }, 15_000);

    server.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (text.includes("6060") || text.toLowerCase().includes("server running")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    server.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited unexpectedly with code ${code}`));
    });
  });
}
import { createServer } from "http";
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./database/prisma";
import { initSocket } from "./socket";

const server = createServer(app);
initSocket(server);

const bootstrap = async () => {
  await prisma.$connect();
  server.listen(env.PORT, "0.0.0.0", () => {
    // eslint-disable-next-line no-console
    console.log(`Vendsor .AI backend listening on 0.0.0.0:${env.PORT}`);
  });
};

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

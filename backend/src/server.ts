import { createServer } from "http";
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./database/prisma";
import { initSocket } from "./socket";

const server = createServer(app);
initSocket(server);

const bootstrap = async () => {
  try {
    await prisma.$connect();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Database not reachable at startup. Server will run with degraded DB features.", error);
  }
  server.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Vendsor .AI backend running on http://localhost:${env.PORT}`);
  });
};

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

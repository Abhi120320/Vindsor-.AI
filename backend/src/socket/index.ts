import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-room", (room: "vendor-room" | "supplier-room" | "customer-room") => {
      socket.join(room);
    });
  });
};

export const getSocket = () => io;

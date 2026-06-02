import { NotificationType } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { getSocket } from "../../socket";

export const createNotification = async (input: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  room?: "vendor-room" | "supplier-room" | "customer-room";
}) => {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "SYSTEM",
    },
  });

  const io = getSocket();
  if (io && input.room) {
    io.to(input.room).emit("notification-created", notification);
  }

  return notification;
};

export const listNotifications = (userId: string) =>
  prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

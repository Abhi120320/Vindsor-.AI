import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (base64: string, folder: string) => {
  if (!env.CLOUDINARY_CLOUD_NAME) {
    return { secure_url: base64 };
  }

  return cloudinary.uploader.upload(base64, { folder });
};

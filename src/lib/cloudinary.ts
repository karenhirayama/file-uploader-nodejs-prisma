import { v2 as cloudinary } from "cloudinary";
import { ENV } from "../config/env";

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Upload failed"));
      } else {
        resolve(result.secure_url);
      }
    });
  });
};

// src/lib/cloudinary.ts - Fixed version
export const extractPublicIdFromUrl = (url: string): string => {
  const matches = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)(?:\.\w+)?$/);

  if (matches && matches[1]) {
    return matches[1];
  }

  throw new Error(`Could not extract public ID from URL: ${url}`);
};

export const deleteFromCloudinary = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const publicId = extractPublicIdFromUrl(url);

    if (!publicId) {
      reject(new Error("Invalid Cloudinary URL"));
      return;
    }

    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else if (result.result !== "ok") {
        reject(new Error(`Delete failed: ${result.result}`));
      } else {
        resolve();
      }
    });
  });
};

export { cloudinary };

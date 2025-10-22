//src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import { ENV } from "../config/env";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
  width?: number;
  height?: number;
}

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

// src/lib/cloudinary.ts
export const uploadToCloudinary = (filePath: string, originalMimetype?: string): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    // Determine resource type based on MIME type
    let resourceType: "image" | "raw" | "auto" = "auto";
    
    // Force PDFs to be treated as raw files to prevent conversion
    if (originalMimetype === 'application/pdf') {
      resourceType = "raw";
    }

    cloudinary.uploader.upload(
      filePath,
      {
        resource_type: resourceType,
        // For non-PDF files, keep your existing optimizations
        ...(resourceType !== "raw" && {
          quality: "auto",
          fetch_format: "auto",
        }),
        // For PDFs, you might want to add pages if you want to extract images
        ...(originalMimetype === 'application/pdf' && {
          pages: true, // This will allow you to get individual pages if needed
        }),
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload failed"));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            resourceType: result.resource_type,
            width: result.width,
            height: result.height,
          });
        }
      }
    );
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

export const deleteFromCloudinary = (url: string, resourceType: string = "image"): Promise<void> => {
  return new Promise((resolve, reject) => {
    const publicId = extractPublicIdFromUrl(url);

    if (!publicId) {
      reject(new Error("Invalid Cloudinary URL"));
      return;
    }

    cloudinary.uploader.destroy(publicId, { 
      resource_type: resourceType === "raw" ? "raw" : "image" 
    }, (error, result) => {
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

// src/routes/files.ts
import express from "express";
import fs from "fs/promises";
import { upload } from "../lib/upload";
import { deleteFromCloudinary, uploadToCloudinary } from "../lib/cloudinary";
import { prisma } from "../lib/db";
import { requireAuth } from "../middleware/auth";
import type { User } from "@prisma/client";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const userId = (req.user as User)!.id;
      const { folderId, page = "1", limit = "50", search, type } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        userId,
        ...(folderId && { folderId: folderId as string }),
        ...(search && {
          OR: [
            {
              originalName: { contains: search as string, mode: "insensitive" },
            },
            { name: { contains: search as string, mode: "insensitive" } },
          ],
        }),
        ...(type && { mimeType: { startsWith: type as string } }),
      };

      const [files, totalCount] = await Promise.all([
        prisma.file.findMany({
          where,
          include: {
            folder: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
          skip,
          take: limitNum,
        }),
        prisma.file.count({ where }),
      ]);

      res.status(200).json({
        files,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({ error: "Failed to get files" });
    }
  }
);

router.post(
  "/upload",
  upload.single("file"),
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      // Additional size check (backup in case multer limits don't catch it)
      if (req.file.size > 10 * 1024 * 1024) {
        await fs.unlink(req.file.path);
        res
          .status(400)
          .json({ error: "File size too large. Maximum size is 10MB." });
        return;
      }

      const userId = (req.user as User)!.id;
      const { folderId } = req.body;

      if (folderId) {
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, userId },
        });

        if (!folder) {
          await fs.unlink(req.file.path);
          res.status(404).json({ error: "Folder not found" });
          return;
        }
      }

      const cloudinaryResult = await uploadToCloudinary(
        req.file.path,
        req.file.mimetype
      );
      await fs.unlink(req.file.path);

      console.log("cloudinaryResult", cloudinaryResult);

      const file = await prisma.file.create({
        data: {
          name: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          url: cloudinaryResult.url,
          userId,
          folderId: folderId ?? null,
          publicId: cloudinaryResult.publicId,
        },
      });

      res.status(201).json({ message: "File uploaded successfully", file });
    } catch (error: any) {
      console.error("Upload error:", error);

      // Clean up uploaded file if it exists
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      }

      // Handle specific multer errors
      if (error.code === "LIMIT_FILE_SIZE") {
        res
          .status(400)
          .json({ error: "File size too large. Maximum size is 10MB." });
        return;
      }

      if (error.message && error.message.includes("Invalid file type")) {
        res.status(400).json({ error: error.message });
        return;
      }

      res
        .status(500)
        .json({ error: "File upload failed, internal server error" });
    }
  }
);

// ... rest of your routes remain the same
router.get(
  "/:id",
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const userId = (req.user as User)!.id;
      const fileId = req.params.id;

      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          userId,
        },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      res.status(200).json(file);
    } catch (error) {
      console.error("Get file error:", error);
      res.status(500).json({ error: "Failed to fetch file" });
    }
  }
);

router.delete(
  "/:id",
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const userId = (req.user as User)!.id;
      const fileId = req.params.id;

      const file = await prisma.file.findFirst({
        where: { id: fileId, userId },
      });

      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      try {
        await deleteFromCloudinary(
          file.url,
          file.mimeType === "application/pdf" ? "raw" : "image"
        );
        console.log(`Successfully deleted file from Cloudinary: ${file.name}`);
      } catch (cloudinaryError) {
        console.error("Failed to delete from Cloudinary:", cloudinaryError);
      }

      await prisma.file.delete({
        where: { id: fileId },
      });

      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  }
);

export default router;

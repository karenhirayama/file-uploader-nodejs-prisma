import { Router, Request, Response } from "express";
import { prisma } from "../lib/db";
import { requireAuth } from "../middleware/auth";
import type { User } from "@prisma/client";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as User)!.id;

    const folders = await prisma.folder.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json(folders);
  } catch (error) {
    console.error("Get folders error:", error);
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as User)!.id;
    const folderId = req.params.id;

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
      include: {
        files: {
          orderBy: { created_at: "desc" },
        },
        children: {
          include: {
            _count: {
              select: {
                files: true,
                children: true,
              },
            },
          },
        },
      },
    });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    res.status(200).json(folder);
  } catch (error) {
    console.error("Get folder error:", error);
    res.status(500).json({ error: "Failed to fetch folder" });
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as User)!.id;
    const { name, description, parentId } = req.body;

    if (!name) {
      res.status(400).json({ error: "Folder name is required" });
      return;
    }

    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId, userId },
      });

      if (!parentFolder) {
        res.status(404).json({ error: "Parent folder not found" });
        return;
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        description,
        userId,
        parentId: parentId || null,
      },
      include: {
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error("Create folder error:", error);
    res.status(500).json({ error: "Failed to create folder" });
  }
});

router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as User)!.id;
    const folderId = req.params.id;
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ error: "Folder name is required" });
      return; // This was missing!
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
      },
    });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    const updatedFolder = await prisma.folder.update({
      where: {
        id: folderId,
      },
      data: {
        name,
        description,
      },
      include: {
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error("Update folder error:", error);
    res.status(500).json({ error: "Failed to update folder" });
  }
});

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as User)!.id;
    const folderId = req.params.id;

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
      include: {
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    if (folder._count.files > 0 || folder._count.children > 0) {
      res.status(400).json({
        error: "Cannot delete folder that contains files or subfolders",
      });
      return;
    }

    await prisma.folder.delete({
      where: { id: folderId },
    });

    res.status(200).json({ message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Delete folder error:", error);
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

export default router;
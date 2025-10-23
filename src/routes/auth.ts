import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { passport } from "../lib/auth";
import { prisma } from "../lib/db";

const router = Router();

// Define proper types for the authentication callback
interface AuthInfo {
  message?: string;
}

interface LoginRequestBody {
  name?: string;
  email?: string;
  password?: string;
}

router.post("/register", async (req: Request<{}, {}, LoginRequestBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true },
    });

    req.login(user, (err: Error | null) => {
      if (err) {
        next(err);
        return;
      }
      res.status(201).json({ message: "User created successfully", user });
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate(
    "local",
    (err: Error | null, user: Express.User | false, info: AuthInfo) => {
      if (err) {
        next(err);
        return;
      }

      if (!user) {
        res.status(401).json({ error: info?.message ?? "Invalid credentials" });
        return;
      }

      req.login(user, (loginErr: Error | null) => {
        if (loginErr) {
          next(loginErr);
          return;
        }
        res.json({ message: "Login successful", user });
      });
    }
  )(req, res, next);
});

router.post("/logout", (req: Request, res: Response, next: NextFunction): void => {
  req.logout((err: Error | null) => {
    if (err) {
      next(err);
      return;
    }
    res.json({ message: "Logout successful" });
  });
});

router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

export default router;
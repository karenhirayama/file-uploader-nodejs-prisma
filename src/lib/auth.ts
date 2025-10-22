// src/lib/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { SessionUser } from "../types/auth";

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          return done(new Error("Email not found"), false);
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return done(new Error("Invalid password"), false);
        }

        // Convert to session user (exclude password)
        const sessionUser: SessionUser = {
          id: user.id,
          name: user.name,
          email: user.email,
        };

        return done(null, sessionUser);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Now use the SessionUser type
passport.serializeUser((user, done) => {
  done(null, (user as SessionUser).id);
});

passport.deserializeUser(async (id: unknown, done) => {
  try {
    if (typeof id !== "string") {
      return done(new Error("Invalid user ID"));
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return done(new Error("User not found"));
    }

    // Convert to SessionUser
    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    return done(null, sessionUser);
  } catch (error) {
    return done(error);
  }
});

export { passport };

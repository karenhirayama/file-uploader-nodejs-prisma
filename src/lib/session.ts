import session from "express-session";
import { prisma } from "./db";
import { ENV } from "../config/env";

const PrismaSessionStore =
  require("@quixo3/prisma-session-store").PrismaSessionStore;

export const sessionConfig = session({
  secret: ENV.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000,
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined,
  }),
  cookie: {
    secure: ENV.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
});

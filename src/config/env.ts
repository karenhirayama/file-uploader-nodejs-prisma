import { config } from "dotenv";

config();

export const ENV = {
  PORT: process.env.PORT ?? 'changeme',
  DATABASE_URL: process.env.DATABASE_URL ?? 'changeme',
  SESSION_SECRET: process.env.SESSION_SECRET ?? 'changeme',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? 'changeme',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? 'changeme',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? 'changeme',
  NODE_ENV: process.env.NODE_ENV ?? 'changeme',
};

const required = ["DATABASE_URL", "SESSION_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

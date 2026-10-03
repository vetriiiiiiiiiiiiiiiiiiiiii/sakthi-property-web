import "dotenv/config";
import crypto from "node:crypto";
import { promisify } from "node:util";
import readline from "node:readline";
import { prisma } from "./src/prisma.js";

const scryptAsync = promisify(crypto.scrypt);

function askPassword() {
  return new Promise((resolve) => {
    process.stdout.write("Enter admin password: ");

    let password = "";

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (key) => {
      if (key === "\u0003") {
        process.stdin.setRawMode(false);
        process.exit();
      }

      if (key === "\r" || key === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(password);
        return;
      }

      if (key === "\u007f") {
        password = password.slice(0, -1);
        return;
      }

      password += key;
    };

    process.stdin.on("data", onData);
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const derivedKey = await scryptAsync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });

  return `scrypt$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

try {
  const existing = await prisma.admin.count();

  if (existing > 0) {
    console.log("An admin account already exists.");
    process.exit(0);
  }

  const password = await askPassword();

  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }

  if (!/[a-z]/.test(password)) {
    throw new Error("Password needs a lowercase letter.");
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error("Password needs an uppercase letter.");
  }

  if (!/[0-9]/.test(password)) {
    throw new Error("Password needs a number.");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password needs a special character.");
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.admin.create({
    data: {
      username: "razi",
      email: "razilmuhamed63101@gmail.com",
      passwordHash,
    },
  });

  console.log(`Admin created successfully: ${admin.username}`);
} catch (error) {
  console.error("Admin creation failed:", error.message);
} finally {
  await prisma.$disconnect();
}


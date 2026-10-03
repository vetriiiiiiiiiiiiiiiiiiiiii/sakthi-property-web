import crypto from "node:crypto";
import { promisify } from "node:util";
import * as cookie from "cookie";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";
import { OAuth2Client } from "google-auth-library";
import fs from "node:fs/promises";
import path from "node:path";

const scryptAsync = promisify(crypto.scrypt);

// Audit logging utility
async function logAudit(action, details = {}) {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(logDir, { recursive: true });
    
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `audit-${today}.log`);
    
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      ...details,
    };
    
    await fs.appendFile(logFile, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error('[AUDIT_LOG_ERROR]', e.message);
  }
}

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sakthi_admin_session";
const COOKIE_SECURE = process.env.NODE_ENV === "production" || String(process.env.COOKIE_SECURE || "false") === "true";
const SESSION_DAYS = 30;
const RESET_MINUTES = 10;

const AUTH_SECRET = process.env.AUTH_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM =
  process.env.MAIL_FROM || "Sakthi Property <onboarding@resend.dev>";
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_AUTO_PROVISION =
  String(process.env.GOOGLE_AUTO_PROVISION || "false") === "true";
const GOOGLE_ALLOWED_EMAIL_DOMAINS = String(
  process.env.GOOGLE_ALLOWED_EMAIL_DOMAINS || ""
)
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);
const googleClient = GOOGLE_CLIENT_ID
  ? new OAuth2Client(GOOGLE_CLIENT_ID)
  : null;

if (!AUTH_SECRET) {
  throw new Error("AUTH_SECRET is missing in server/.env");
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function jsonError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function googleEmailIsAllowed(email) {
  if (GOOGLE_ALLOWED_EMAIL_DOMAINS.length === 0) {
    return true;
  }

  const domain = email.split("@")[1] || "";
  return GOOGLE_ALLOWED_EMAIL_DOMAINS.includes(domain);
}

async function availableGoogleUsername(prisma, name, email) {
  const base = (name || email.split("@")[0] || "admin")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 28) || "admin";

  for (let index = 0; index < 100; index += 1) {
    const suffix = index === 0 ? "" : String(index + 1);
    const username = `${base.slice(0, 32 - suffix.length)}${suffix}`;
    const existing = await prisma.admin.findUnique({ where: { username } });

    if (!existing) {
      return username;
    }
  }

  throw jsonError("Unable to create a unique administrator username.", 409);
}

function validateUsername(username) {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw jsonError(
      "Username must be 3-32 characters and contain only letters, numbers, dot, underscore or hyphen."
    );
  }
}

function validatePassword(password) {
  const value = String(password || "");

  if (value.length < 12) {
    throw jsonError("Password must be at least 12 characters.");
  }

  if (!/[a-z]/.test(value)) {
    throw jsonError("Password must contain a lowercase letter.");
  }

  if (!/[A-Z]/.test(value)) {
    throw jsonError("Password must contain an uppercase letter.");
  }

  if (!/[0-9]/.test(value)) {
    throw jsonError("Password must contain a number.");
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    throw jsonError("Password must contain a special character.");
  }
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

async function verifyPassword(password, storedHash) {
  try {
    const parts = String(storedHash).split("$");

    if (parts.length !== 3 || parts[0] !== "scrypt") {
      return false;
    }

    const [, salt, storedHex] = parts;

    const derivedKey = await scryptAsync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
    });

    const storedBuffer = Buffer.from(storedHex, "hex");
    const derivedBuffer = Buffer.from(derivedKey);

    if (storedBuffer.length !== derivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedBuffer, derivedBuffer);
  } catch {
    return false;
  }
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [body, signature] = String(token || "").split(".");

    if (!body || !signature) {
      return null;
    }

    const expected = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(body)
      .digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    );

    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    })
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize(COOKIE_NAME, "", {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
  );
}

async function createSession(prisma, adminId) {
  const rawToken = randomToken();
  const tokenHash = sha256(rawToken);

  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.adminSession.create({
    data: {
      adminId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}

function readSessionToken(req) {
  const cookies = cookie.parse(req.headers.cookie || "");
  return cookies[COOKIE_NAME] || null;
}

export async function requireAdmin(req, res, next) {
  try {
    const token = readSessionToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const tokenHash = sha256(token);

    const session = await req.prisma.adminSession.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });

    if (!session) {
      clearSessionCookie(res);

      return res.status(401).json({
        message: "Session expired.",
      });
    }

    if (session.expiresAt <= new Date()) {
      await req.prisma.adminSession.delete({
        where: { id: session.id },
      }).catch(() => {});

      clearSessionCookie(res);

      return res.status(401).json({
        message: "Session expired.",
      });
    }

    req.admin = session.admin;

    await req.prisma.adminSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    next();
  } catch (error) {
    next(error);
  }
}

export function registerAuth(app, prisma) {
  app.use((req, res, next) => {
    req.prisma = prisma;
    next();
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many login attempts. Please try again later.",
    },
  });

  const forgotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many reset requests. Please try again later.",
    },
  });

  // -------------------- Auth status --------------------

  app.get("/api/auth/status", async (req, res, next) => {
    try {
      const count = await prisma.admin.count();

      res.json({
        configured: count > 0,
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------- One-time admin setup --------------------

  app.post("/api/auth/setup", async (req, res, next) => {
    try {
      const setupKey = String(req.headers["x-setup-key"] || "");

      if (!process.env.AUTH_SETUP_KEY || setupKey !== process.env.AUTH_SETUP_KEY) {
        return res.status(403).json({
          message: "Invalid setup key.",
        });
      }

      const existing = await prisma.admin.count();

      if (existing > 0) {
        return res.status(409).json({
          message: "Admin account already exists.",
        });
      }

      const username = normalizeUsername(req.body.username);
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || "");

      validateUsername(username);
      validatePassword(password);

      if (!email || !email.includes("@")) {
        throw jsonError("A valid recovery email is required.");
      }

      const passwordHash = await hashPassword(password);

      const admin = await prisma.admin.create({
        data: {
          username,
          email,
          passwordHash,
        },
      });

      res.status(201).json({
        success: true,
        user: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: "Administrator",
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------- Login --------------------

  app.post("/api/auth/login", loginLimiter, async (req, res, next) => {
    try {
      const username = normalizeUsername(req.body.username);
      const password = String(req.body.password || "");

      if (!username || !password) {
        await logAudit('LOGIN_FAILED', { reason: 'missing_credentials', username, ip: req.ip });
        return res.status(400).json({
          message: "Enter username and password.",
        });
      }

      const admin = await prisma.admin.findUnique({
        where: { username },
      });

      if (!admin) {
        await logAudit('LOGIN_FAILED', { reason: 'user_not_found', username, ip: req.ip });
        return res.status(401).json({
          message: "Invalid username or password.",
        });
      }

      if (admin.lockedUntil && admin.lockedUntil > new Date()) {
        await logAudit('LOGIN_FAILED', { reason: 'account_locked', username, ip: req.ip });
        return res.status(423).json({
          message: "Account temporarily locked. Try again later.",
        });
      }

      const valid = await verifyPassword(password, admin.passwordHash);

      if (!valid) {
        const attempts = admin.failedLoginAttempts + 1;

        await prisma.admin.update({
          where: { id: admin.id },
          data: {
            failedLoginAttempts: attempts >= 5 ? 0 : attempts,
            lockedUntil:
              attempts >= 5
                ? new Date(Date.now() + 10 * 60 * 1000)
                : null,
          },
        });

        await logAudit('LOGIN_FAILED', { reason: 'invalid_password', username, ip: req.ip, attempts });
        return res.status(401).json({
          message: "Invalid username or password.",
        });
      }

      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      const sessionToken = await createSession(prisma, admin.id);

      await logAudit('LOGIN_SUCCESS', { username, adminId: admin.id, ip: req.ip });

      setSessionCookie(res, sessionToken);

      res.json({
        success: true,
        user: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          profilePhoto: admin.profilePhoto,
          role: "Administrator",
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------- Google Auth --------------------

  app.post("/api/auth/google", loginLimiter, async (req, res, next) => {
    try {
      if (!googleClient) {
        return res.status(503).json({
          message: "Google sign-in is not configured on this server.",
        });
      }

      if (GOOGLE_AUTO_PROVISION && GOOGLE_ALLOWED_EMAIL_DOMAINS.length === 0) {
        return res.status(503).json({
          message:
            "Google auto-provisioning requires GOOGLE_ALLOWED_EMAIL_DOMAINS.",
        });
      }

      const credential = String(req.body.credential || "");

      if (!credential) {
        return res.status(400).json({
          message: "A Google ID token is required.",
        });
      }

      let payload;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch {
        return res.status(401).json({
          message: "Google could not verify this sign-in. Please try again.",
        });
      }

      const normalizedEmail = normalizeEmail(payload?.email);
      const googleId = String(payload?.sub || "");
      const name = String(payload?.name || "");
      const picture = String(payload?.picture || "");

      if (!normalizedEmail || !googleId || payload?.email_verified !== true) {
        return res.status(401).json({
          message: "Your Google account must have a verified email address.",
        });
      }

      if (!googleEmailIsAllowed(normalizedEmail)) {
        return res.status(403).json({
          message: "This Google account is not permitted to access this application.",
        });
      }

      let admin = await prisma.admin.findUnique({ where: { googleId } });

      if (admin && admin.email !== normalizedEmail) {
        return res.status(403).json({
          message: "This Google account does not match the linked administrator account.",
        });
      }

      if (!admin) {
        admin = await prisma.admin.findUnique({
          where: { email: normalizedEmail },
        });
      }

      if (!admin) {
        if (GOOGLE_AUTO_PROVISION) {
          const username = await availableGoogleUsername(
            prisma,
            name,
            normalizedEmail
          );
          admin = await prisma.admin.create({
            data: {
              username,
              email: normalizedEmail,
              googleId,
              profilePhoto: picture || null,
            },
          });
        } else {
          return res.status(403).json({
            message: "This Google account has not been granted administrator access.",
          });
        }
      } else if (!admin.googleId) {
        admin = await prisma.admin.update({
          where: { id: admin.id },
          data: {
            googleId,
            profilePhoto: admin.profilePhoto || picture || null,
          },
        });
      }

      const sessionToken = await createSession(prisma, admin.id);
      setSessionCookie(res, sessionToken);

      res.json({
        success: true,
        user: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          profilePhoto: admin.profilePhoto,
          role: "Administrator",
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------- Current session --------------------

  app.get("/api/auth/me", async (req, res) => {
    const token = readSessionToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Not authenticated.",
      });
    }

    const session = await prisma.adminSession.findUnique({
      where: {
        tokenHash: sha256(token),
      },
      include: {
        admin: true,
      },
    });

    if (
      !session ||
      session.expiresAt <= new Date()
    ) {
      clearSessionCookie(res);

      return res.status(401).json({
        message: "Not authenticated.",
      });
    }

    res.json({
      user: {
        id: session.admin.id,
        username: session.admin.username,
        email: session.admin.email,
        profilePhoto: session.admin.profilePhoto,
        role: "Administrator",
      },
    });
  });

  // -------------------- Logout --------------------

  app.post("/api/auth/logout", async (req, res, next) => {
    try {
      const token = readSessionToken(req);

      if (token) {
        await prisma.adminSession
          .delete({
            where: {
              tokenHash: sha256(token),
            },
          })
          .catch(() => {});
      }

      clearSessionCookie(res);

      res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------- Forgot password request --------------------

  app.post(
    "/api/auth/forgot/request-otp",
    forgotLimiter,
    async (req, res, next) => {
      try {
        const identifier = normalizeEmail(req.body.identifier);

        const admin = await prisma.admin.findUnique({
          where: { email: identifier },
        });

        // Always return the same response to avoid exposing
        // whether an email exists.
        if (!admin) {
          return res.json({
            success: true,
            message:
              "If the email is registered, a verification code has been sent.",
          });
        }

        await prisma.passwordResetCode.deleteMany({
          where: { adminId: admin.id },
        });

        const code = String(
          Math.floor(100000 + Math.random() * 900000)
        );

        const codeHash = sha256(code);

        const expiresAt = new Date(
          Date.now() + RESET_MINUTES * 60 * 1000
        );

        const record = await prisma.passwordResetCode.create({
          data: {
            adminId: admin.id,
            codeHash,
            expiresAt,
          },
        });

        if (!resend) {
          await prisma.passwordResetCode.delete({
            where: { id: record.id },
          });

          return res.status(500).json({
            message:
              "Email service is not configured. Add RESEND_API_KEY to server/.env.",
          });
        }

        await resend.emails.send({
          from: MAIL_FROM,
          to: [admin.email],
          subject: "Sakthi Property - Password Reset Code",
          text:
            `Your Sakthi Property password reset code is ${code}.\n\n` +
            `This code expires in ${RESET_MINUTES} minutes.\n\n` +
            `If you did not request this, ignore this email.`,
        });

        const verificationToken = signToken({
          purpose: "verify-reset",
          resetId: record.id,
          adminId: admin.id,
          exp: Date.now() + RESET_MINUTES * 60 * 1000,
        });

        res.json({
          success: true,
          verificationToken,
          message:
            "If the email is registered, a verification code has been sent.",
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // -------------------- Verify reset OTP --------------------

  app.post("/api/auth/forgot/verify-otp", async (req, res, next) => {
    try {
      const otp = String(req.body.otp || "").trim();
      const verificationToken = String(
        req.body.verificationToken || ""
      );

      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          message: "Enter the 6-digit verification code.",
        });
      }

      const payload = verifyToken(verificationToken);

      if (
        !payload ||
        payload.purpose !== "verify-reset"
      ) {
        return res.status(400).json({
          message: "Verification session expired.",
        });
      }

      const record = await prisma.passwordResetCode.findUnique({
        where: { id: payload.resetId },
      });

      if (!record || record.adminId !== payload.adminId) {
        return res.status(400).json({
          message: "Verification session expired.",
        });
      }

      if (record.expiresAt <= new Date()) {
        await prisma.passwordResetCode.delete({
          where: { id: record.id },
        });

        return res.status(400).json({
          message: "Verification code expired.",
        });
      }

      if (record.attempts >= 5) {
        return res.status(429).json({
          message: "Too many incorrect attempts.",
        });
      }

      const valid = sha256(otp) === record.codeHash;

      if (!valid) {
        const attempts = record.attempts + 1;

        await prisma.passwordResetCode.update({
          where: { id: record.id },
          data: { attempts },
        });

        return res.status(400).json({
          message: "Incorrect verification code.",
        });
      }

      await prisma.passwordResetCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      const resetToken = signToken({
        purpose: "reset-password",
        resetId: record.id,
        adminId: record.adminId,
        exp: Date.now() + RESET_MINUTES * 60 * 1000,
      });

      res.json({
        success: true,
        resetToken,
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------- Reset password --------------------

  app.post("/api/auth/forgot/reset-password", async (req, res, next) => {
    try {
      const resetToken = String(req.body.resetToken || "");
      const password = String(req.body.password || "");

      validatePassword(password);

      const payload = verifyToken(resetToken);

      if (
        !payload ||
        payload.purpose !== "reset-password"
      ) {
        return res.status(400).json({
          message: "Password reset session expired.",
        });
      }

      const record = await prisma.passwordResetCode.findUnique({
        where: { id: payload.resetId },
      });

      if (
        !record ||
        record.adminId !== payload.adminId ||
        !record.usedAt ||
        record.expiresAt <= new Date()
      ) {
        return res.status(400).json({
          message: "Password reset session expired.",
        });
      }

      const passwordHash = await hashPassword(password);

      await prisma.$transaction([
        prisma.admin.update({
          where: { id: record.adminId },
          data: {
            passwordHash,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        }),

        prisma.adminSession.deleteMany({
          where: { adminId: record.adminId },
        }),

        prisma.passwordResetCode.delete({
          where: { id: record.id },
        }),
      ]);

      res.json({
        success: true,
        message: "Password changed successfully.",
      });
      await logAudit('PASSWORD_RESET', { adminId: record.adminId });
    } catch (error) {
      next(error);
    }
  });
}

export { logAudit };

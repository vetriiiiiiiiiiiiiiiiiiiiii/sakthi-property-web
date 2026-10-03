import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const allowedTypes = {
  jpg: { mimeType: "image/jpeg", matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  jpeg: { mimeType: "image/jpeg", matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  png: { mimeType: "image/png", matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  webp: { mimeType: "image/webp", matches: (buffer) => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
  pdf: { mimeType: "application/pdf", matches: (buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-" },
  doc: { mimeType: "application/msword", matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
  docx: { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", matches: (buffer) => buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04 },
};

const storageDirectory = () => path.resolve(process.env.FILE_STORAGE_DIR || path.join(process.cwd(), "uploads"));

function safeName(value) {
  return path.basename(String(value || "document"))
    .replace(/[\\/\u0000-\u001f<>:"|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "document";
}

function getFile(id) {
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|jpeg|png|webp|pdf|doc|docx)$/i.exec(id);
  if (!match) return null;
  const extension = match[2].toLowerCase();
  return { path: path.join(storageDirectory(), id), mimeType: allowedTypes[extension].mimeType };
}

export async function storeUploadedFile(originalName, data) {
  const name = safeName(originalName);
  const extension = path.extname(name).slice(1).toLowerCase();
  const type = allowedTypes[extension];
  if (!type) throw Object.assign(new Error("File type not allowed."), { status: 415 });
  if (!Buffer.isBuffer(data) || data.length === 0) throw Object.assign(new Error("The selected file is empty."), { status: 400 });
  if (data.length > MAX_FILE_BYTES) throw Object.assign(new Error("File is too large. Maximum allowed size is 10 MB."), { status: 413 });
  if (!type.matches(data)) throw Object.assign(new Error("The file contents do not match the file type."), { status: 415 });

  const id = `${crypto.randomUUID()}.${extension}`;
  await fs.mkdir(storageDirectory(), { recursive: true, mode: 0o750 });
  await fs.writeFile(path.join(storageDirectory(), id), data, { flag: "wx", mode: 0o640 });
  return { id, name, type: type.mimeType, size: data.length, fileUrl: `/api/files/${id}`, uploadedAt: new Date().toISOString() };
}

export async function readStoredFile(id) {
  const file = getFile(id);
  if (!file) return null;
  try {
    return { data: await fs.readFile(file.path), mimeType: file.mimeType };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

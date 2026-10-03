import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readStoredFile, storeUploadedFile } from "./fileStorage.js";

let storageDirectory;

before(async () => {
  storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "sakthi-uploads-"));
  process.env.FILE_STORAGE_DIR = storageDirectory;
});

after(async () => {
  delete process.env.FILE_STORAGE_DIR;
  await fs.rm(storageDirectory, { recursive: true, force: true });
});

test("stores files in the configured server directory and reads them by protected file id", async () => {
  const data = Buffer.from("%PDF-1.7\nserver-stored document");
  const saved = await storeUploadedFile("../lease.pdf", data);

  assert.equal(saved.name, "lease.pdf");
  assert.equal(saved.type, "application/pdf");
  assert.equal(saved.size, data.length);
  assert.match(saved.fileUrl, /^\/api\/files\/[0-9a-f-]+\.pdf$/);
  assert.deepEqual((await readStoredFile(saved.id)).data, data);
});

test("rejects unsupported types and files whose contents do not match their extension", async () => {
  await assert.rejects(storeUploadedFile("script.html", Buffer.from("<script>bad</script>")), { status: 415 });
  await assert.rejects(storeUploadedFile("fake.pdf", Buffer.from("not a PDF")), { status: 415 });
  assert.equal(await readStoredFile("../outside.pdf"), null);
});

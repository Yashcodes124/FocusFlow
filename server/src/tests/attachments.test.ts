process.env.NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { eq } from "drizzle-orm";
import app from "../app.js";
import { db } from "../../../src/db/index.js";
import { users } from "../../../src/db/schema.js";
import {
  decodeAndValidateBase64,
  MAX_ATTACHMENT_BYTES,
  normalizeAttachmentMimeType,
  sanitizeAttachmentFileName,
} from "../validators/attachment.validator.js";

test("sanitizeAttachmentFileName strips path traversal and unsafe characters", () => {
  assert.equal(sanitizeAttachmentFileName("../../secret/report?.pdf"), "report_.pdf");
  assert.equal(sanitizeAttachmentFileName("  meeting   notes.txt "), "meeting notes.txt");
  assert.equal(sanitizeAttachmentFileName(".."), "attachment");
});

test("normalizeAttachmentMimeType infers safe MIME types from file extensions when browser sends octet-stream", () => {
  assert.equal(
    normalizeAttachmentMimeType("application/octet-stream", "notes.md"),
    "text/markdown",
  );
  assert.equal(normalizeAttachmentMimeType("", "spec.json"), "application/json");
  assert.equal(normalizeAttachmentMimeType("IMAGE/PNG; charset=binary", "x.png"), "image/png");
});

test("decodeAndValidateBase64 validates base64 payload and enforces 512 KB cap", () => {
  const sample = Buffer.from("FocusFlow quick attachment").toString("base64");
  const decoded = decodeAndValidateBase64(`data:text/plain;base64,${sample}`);
  assert.equal(decoded.sizeBytes, 26);
  assert.equal(decoded.buffer.toString("utf8"), "FocusFlow quick attachment");

  const oversized = Buffer.alloc(MAX_ATTACHMENT_BYTES + 1, 65).toString("base64");
  assert.throws(() => decodeAndValidateBase64(oversized), /512 KB/);
  assert.throws(() => decodeAndValidateBase64("%%%not-base64%%%"), /Invalid base64/);
});

test("Task attachments integration: upload up to 2 small files, reject 3rd/oversized/unsafe, download, isolate, and delete", async () => {
  let server: Server | null = null;
  const createdUserIds: string[] = [];

  try {
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const registerUser = async (email: string) => {
      const res = await fetch(`${baseUrl}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Attachment User",
          email,
          password: "Password123!",
        }),
      });
      const body = (await res.json()) as {
        token: string;
        user: { id: string };
      };
      assert.equal(res.status, 201);
      createdUserIds.push(body.user.id);
      return body.token;
    };

    const tokenA = await registerUser(`attach-a-${suffix}@example.com`);
    const tokenB = await registerUser(`attach-b-${suffix}@example.com`);

    // Create task for user A
    const taskRes = await fetch(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ title: "Task with quick attachments" }),
    });
    const taskBody = (await taskRes.json()) as { data: { id: string; attachments: unknown[] } };
    assert.equal(taskRes.status, 201);
    assert.deepEqual(taskBody.data.attachments, []);
    const taskId = taskBody.data.id;

    // 1. Upload 1st attachment (.txt)
    const firstContent = "Checklist:\n- Verify backups\n- Update runbook\n";
    const upload1 = await fetch(`${baseUrl}/api/tasks/${taskId}/attachments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        fileName: "checklist.txt",
        mimeType: "text/plain",
        dataBase64: Buffer.from(firstContent, "utf8").toString("base64"),
      }),
    });
    const upload1Body = (await upload1.json()) as {
      data: { id: string; fileName: string; sizeBytes: number; dataBase64?: string };
    };
    assert.equal(upload1.status, 201);
    assert.equal(upload1Body.data.fileName, "checklist.txt");
    assert.equal(upload1Body.data.sizeBytes, Buffer.byteLength(firstContent, "utf8"));
    assert.equal(upload1Body.data.dataBase64, undefined);

    // 2. Reject unsupported MIME type (HTML/script)
    const badMime = await fetch(`${baseUrl}/api/tasks/${taskId}/attachments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        fileName: "script.html",
        mimeType: "text/html",
        dataBase64: Buffer.from("<script>alert(1)</script>").toString("base64"),
      }),
    });
    assert.equal(badMime.status, 400);

    // 3. Reject > 512 KB attachment
    const tooLarge = await fetch(`${baseUrl}/api/tasks/${taskId}/attachments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        fileName: "large.txt",
        mimeType: "text/plain",
        dataBase64: Buffer.alloc(MAX_ATTACHMENT_BYTES + 10, 97).toString("base64"),
      }),
    });
    assert.equal(tooLarge.status, 400);

    // 4. Upload 2nd attachment (.json)
    const upload2 = await fetch(`${baseUrl}/api/tasks/${taskId}/attachments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        fileName: "config.json",
        mimeType: "application/json",
        dataBase64: Buffer.from('{"ok":true}').toString("base64"),
      }),
    });
    assert.equal(upload2.status, 201);

    // 5. Reject 3rd attachment (max 2 per task)
    const upload3 = await fetch(`${baseUrl}/api/tasks/${taskId}/attachments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        fileName: "third.txt",
        mimeType: "text/plain",
        dataBase64: Buffer.from("third").toString("base64"),
      }),
    });
    assert.equal(upload3.status, 400);

    // 6. Verify task listing hydrates metadata without dataBase64
    const getRes = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getBody = (await getRes.json()) as {
      data: { attachments: Array<{ id: string; fileName: string; dataBase64?: string }> };
    };
    assert.equal(getRes.status, 200);
    assert.equal(getBody.data.attachments.length, 2);
    assert.equal(getBody.data.attachments[0]!.dataBase64, undefined);

    // 7. Download returns exact bytes + attachment header, and user B gets 404
    const dlA = await fetch(
      `${baseUrl}/api/tasks/${taskId}/attachments/${upload1Body.data.id}/download`,
      { headers: { Authorization: `Bearer ${tokenA}` } },
    );
    assert.equal(dlA.status, 200);
    assert.match(dlA.headers.get("content-disposition") ?? "", /attachment; filename="checklist\.txt"/);
    assert.equal(await dlA.text(), firstContent);

    const dlB = await fetch(
      `${baseUrl}/api/tasks/${taskId}/attachments/${upload1Body.data.id}/download`,
      { headers: { Authorization: `Bearer ${tokenB}` } },
    );
    assert.equal(dlB.status, 404);

    // 8. Delete 1st attachment succeeds and drops count to 1
    const delRes = await fetch(
      `${baseUrl}/api/tasks/${taskId}/attachments/${upload1Body.data.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenA}` },
      },
    );
    assert.equal(delRes.status, 200);

    const afterDel = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const afterDelBody = (await afterDel.json()) as {
      data: { attachments: unknown[] };
    };
    assert.equal(afterDelBody.data.attachments.length, 1);
  } finally {
    for (const userId of createdUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
  }
});

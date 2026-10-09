import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { StorageBox, StorageBoxError, deliveryUrl, transformation, verifyWebhook, withTransform } from "../dist/index.js";

test("transformation builds a segment from options", () => {
  assert.equal(transformation({ width: 400, height: 300, crop: "fill", format: "webp" }), "w_400,h_300,c_fill,f_webp");
  assert.equal(transformation({}), "");
});

test("deliveryUrl and withTransform build permanent links", () => {
  assert.equal(
    deliveryUrl({ baseUrl: "https://cdn.test/", cloudName: "acme", publicId: "logo", ext: "png", transform: { width: 200 } }),
    "https://cdn.test/f/acme/w_200/logo.png",
  );
  assert.equal(withTransform("https://cdn.test/f/acme/logo.png", "w_200,f_webp"), "https://cdn.test/f/acme/w_200,f_webp/logo.png");
  assert.equal(withTransform("https://cdn.test/f/acme/logo.png"), "https://cdn.test/f/acme/logo.png");
});

test("verifyWebhook accepts the right signature and rejects tampering", async () => {
  const body = JSON.stringify({ event: "file.uploaded", createdAt: "2026-10-09T00:00:00Z", data: { publicId: "x" } });
  const signature = createHmac("sha256", "whsec_test").update(body).digest("hex");
  assert.deepEqual((await verifyWebhook(body, signature, "whsec_test"))?.data, { publicId: "x" });
  assert.equal(await verifyWebhook(body, signature, "wrong"), null);
  assert.equal(await verifyWebhook(`${body} `, signature, "whsec_test"), null);
  assert.equal(await verifyWebhook(body, undefined, "whsec_test"), null);
});

test("API errors surface as StorageBoxError", async () => {
  const fakeFetch = async () =>
    new Response(JSON.stringify({ status: "error", message: "Invalid API key", errorCode: "E1006" }), { status: 401 });
  const client = new StorageBox({ baseUrl: "https://api.test", apiKey: "k", apiSecret: "s", fetch: fakeFetch });
  await assert.rejects(client.files.list(), (error) => error instanceof StorageBoxError && error.status === 401 && error.code === "E1006");
});

const { STORAGEBOX_URL, STORAGEBOX_KEY, STORAGEBOX_SECRET } = process.env;

test("live: upload, list, sign, transform and delete", { skip: !STORAGEBOX_KEY && "set STORAGEBOX_URL/KEY/SECRET" }, async () => {
  const client = new StorageBox({ baseUrl: STORAGEBOX_URL ?? "http://localhost:4200", apiKey: STORAGEBOX_KEY, apiSecret: STORAGEBOX_SECRET });
  const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  const file = await client.files.upload({ data: pdf, filename: "sdk-test.pdf", type: "application/pdf" }, { collection: "sdk-tests", tags: ["sdk"] });
  try {
    assert.equal(file.ext, "pdf");
    assert.ok(file.url, "public upload returns a permanent link");
    assert.equal((await fetch(file.url)).status, 200);

    const listed = await client.files.list({ collection: "sdk-tests", tag: "sdk" });
    assert.ok(listed.items.some((item) => item.publicId === file.publicId));

    await client.files.update(file.publicId, { access: "PRIVATE" });
    assert.equal((await fetch(file.url)).status, 403);
    const signed = await client.files.signedUrl(file.publicId, { expiresIn: 120 });
    assert.equal((await fetch(signed.url)).status, 200);

    const usage = await client.usage();
    assert.ok(usage.fileCount >= 1);
  } finally {
    await client.files.delete(file.publicId);
  }
  await assert.rejects(client.files.get(file.publicId), (error) => error.status === 404);
});

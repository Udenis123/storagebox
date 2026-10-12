import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { StorageBoxError } from "../dist/esm/index.js";
import { importFolder, publicIdFor } from "../dist/esm/cli/folderImport.js";

async function makeFolder() {
  const root = await mkdtemp(path.join(tmpdir(), "sbx-cli-"));
  await mkdir(path.join(root, "Été 2026"), { recursive: true });
  await writeFile(path.join(root, "a.txt"), "a");
  await writeFile(path.join(root, "b.csv"), "b");
  await writeFile(path.join(root, "tool.exe"), "x");
  await writeFile(path.join(root, ".DS_Store"), "x");
  await writeFile(path.join(root, "Été 2026", "beach (1).jpg"), "jpg");
  return root;
}

function fakeClient(respond = () => undefined) {
  const calls = [];
  return {
    calls,
    files: {
      upload: async (source, options) => {
        calls.push({ filename: source.filename, ...options });
        respond(calls.length);
        return [];
      },
    },
  };
}

const run = (root, client, overrides = {}) =>
  importFolder({
    client,
    folder: root,
    collection: "import",
    concurrency: 2,
    statePath: path.join(root, ".state.json"),
    shouldStop: () => false,
    onProgress: () => undefined,
    ...overrides,
  });

test("publicIdFor is stable, valid and differs per path", () => {
  const id = publicIdFor(path.join("Été 2026", "beach (1).jpg"));
  assert.match(id, /^beach-1_[0-9a-f]{10}$/);
  assert.equal(id, publicIdFor(path.join("Été 2026", "beach (1).jpg")));
  assert.notEqual(publicIdFor("a/x.txt"), publicIdFor("b/x.txt"));
});

test("importFolder maps folders to collections and skips unsupported and hidden files", async () => {
  const root = await makeFolder();
  const client = fakeClient();
  const progress = await run(root, client, { access: "PRIVATE" });

  assert.deepEqual(
    client.calls.map((call) => [call.filename, call.collection, call.access]).sort(),
    [
      ["a.txt", "import", "PRIVATE"],
      ["b.csv", "import", "PRIVATE"],
      ["beach (1).jpg", "import/Ete 2026", "PRIVATE"],
    ],
  );
  assert.equal(progress.uploaded, 3);
  assert.equal(progress.unsupported, 1);
  assert.equal(progress.processed, 4);
});

test("importFolder resumes from its checkpoint and treats a taken public ID as already uploaded", async () => {
  const root = await makeFolder();
  let shouldStop = false;
  const first = fakeClient(() => (shouldStop = true));
  await run(root, first, { concurrency: 1, shouldStop: () => shouldStop });
  assert.equal(first.calls.length, 1);
  assert.equal(JSON.parse(await readFile(path.join(root, ".state.json"), "utf8")).nextIndex, 1);

  const second = fakeClient((count) => {
    if (count === 1) throw new StorageBoxError("taken", 409);
  });
  const progress = await run(root, second);
  assert.equal(second.calls.length, 2);
  assert.equal(progress.processed, 4);
  assert.equal(progress.alreadyThere, 1);
  assert.equal(progress.uploaded, 2);
});

test("importFolder logs files that fail permanently", async () => {
  const root = await makeFolder();
  const client = fakeClient(() => {
    throw new StorageBoxError("too large", 400);
  });
  const progress = await run(root, client);
  assert.equal(progress.failed, 3);
  const log = await readFile(path.join(root, ".state.json.errors.log"), "utf8");
  assert.equal(log.trim().split("\n").length, 3);
});

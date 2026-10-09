const assert = require("node:assert/strict");
const { test } = require("node:test");
const { StorageBox, transformation, DEFAULT_BASE_URL } = require("storagebox");

test("CommonJS require resolves the package", () => {
  assert.equal(typeof StorageBox, "function");
  assert.equal(transformation({ width: 100 }), "w_100");
  assert.equal(DEFAULT_BASE_URL, "https://storagebox.urbinaryhub.com");
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");

const root = path.join(__dirname, "..");
const packageJson = require(path.join(root, "package.json"));
const packageLock = require(path.join(root, "package-lock.json"));

describe("npm package contract", () => {
  it("builds from checked-in sources without the tree-sitter CLI", () => {
    assert.equal(packageJson.version, "0.7.1");
    assert.equal(packageJson.scripts.install, "node-gyp-build");
    assert.equal(
      packageJson.scripts.test,
      "node --test bindings/node/binding_test.js test/package_contract_test.js"
    );
    assert.equal(packageJson.scripts.prestart, undefined);
    assert.equal(packageJson.scripts.start, undefined);
    assert.equal(packageJson.dependencies["tree-sitter-cli"], undefined);
    assert.equal(packageJson.dependencies.which, undefined);
    assert.equal(
      packageLock.packages[""].dependencies["tree-sitter-cli"],
      undefined
    );
    assert.equal(
      packageLock.packages["node_modules/tree-sitter-cli"],
      undefined
    );
    assert.equal(packageLock.version, packageJson.version);
    assert.equal(packageLock.packages[""].version, packageJson.version);
    assert.equal(packageJson.peerDependencies["tree-sitter"], "^0.25.1");

    for (const relativePath of [
      "binding.gyp",
      "bindings/node/binding.cc",
      "bindings/node/index.d.ts",
      "bindings/node/index.js",
      "src/node-types.json",
      "src/parser.c",
      "src/scanner.c",
      "src/tree_sitter/parser.h",
    ]) {
      assert.ok(
        fs.statSync(path.join(root, relativePath)).size > 0,
        relativePath
      );
    }
  });
});

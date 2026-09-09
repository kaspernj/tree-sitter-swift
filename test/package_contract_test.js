const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");

const root = path.join(__dirname, "..");
const packageJson = require(path.join(root, "package.json"));
const packageLock = require(path.join(root, "package-lock.json"));
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const workflowPaths = [
  "generate-static-grammar.yml",
  "publish-rust.yml",
  "release.yml",
];
const workflows = Object.fromEntries(
  workflowPaths.map((file) => [
    file,
    fs.readFileSync(path.join(root, ".github", "workflows", file), "utf8"),
  ])
);

function pushTrigger(workflow) {
  const match = workflow.match(
    /(?:^|\n)(on:\n  push:\n[\s\S]*?)(?=\n\n(?:concurrency:|jobs:))/
  );
  assert.ok(match);
  return match[1];
}

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

    const documentedDependency = readme.match(
      /"tree-sitter-swift": "([^"]+)"/
    )?.[1];
    assert.equal(
      documentedDependency,
      "https://github.com/kaspernj/tree-sitter-swift/archive/<40-character-commit-sha>.tar.gz"
    );
    assert.doesNotMatch(
      readme,
      /"tree-sitter-swift": "git\+https:\/\/github\.com\//
    );

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

  it("excludes Semantifold source tags from inherited release workflows", () => {
    assert.deepEqual(Object.keys(workflows), workflowPaths);
    assert.equal(
      pushTrigger(workflows["generate-static-grammar.yml"]),
      'on:\n  push:\n    tags:\n      - "*"\n      - "!v*-semantifold.*"'
    );

    const releaseTrigger =
      'on:\n  push:\n    tags-ignore: ["*-with-generated-files", "v*-semantifold.*"]';
    assert.equal(pushTrigger(workflows["publish-rust.yml"]), releaseTrigger);
    assert.equal(pushTrigger(workflows["release.yml"]), releaseTrigger);
  });
});

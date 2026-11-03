#!/usr/bin/env node
// Pre-commit sanity checks on the staged snapshot (not the working tree):
// secrets/artifacts, oversized files, conflict markers, focused tests, eslint errors.
const { execFileSync } = require('child_process');

const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Content checks skip anything larger; it's binary or generated. */
const MAX_SCANNED_BYTES = 1024 * 1024;

const BLOCKED_PATHS = [
  { pattern: /(^|\/)\.env(\.(?!example$)[^/]+)?$/, reason: 'secret: env file' },
  { pattern: /\.(jks|keystore|p12|pem)$/i, reason: 'secret: signing key' },
  { pattern: /credentials[^/]*\.(md|txt|json|ya?ml)$/i, reason: 'secret: credentials file' },
  { pattern: /(^|\/)google-services\.json$/, reason: 'secret: google-services.json' },
  { pattern: /\.(apk|aab|ipa)$/i, reason: 'build artifact' },
];

const CONFLICT_MARKER = /^(<{7}|>{7})(\s|$)/;
const FOCUSED_TEST = /(\b(describe|it|test)\.only|\b(fit|fdescribe))\s*\(/;
const TEST_FILE = /(^|\/)__tests__\/|\.(test|spec)\.[jt]sx?$/;
const LINTABLE = /\.tsx?$/;

function findBlockedPath(path, sizeBytes) {
  const blocked = BLOCKED_PATHS.find(({ pattern }) => pattern.test(path));
  if (blocked) return blocked.reason;
  if (sizeBytes > MAX_FILE_BYTES) {
    return `file is ${(sizeBytes / 1024 / 1024).toFixed(1)} MB (limit ${MAX_FILE_BYTES / 1024 / 1024} MB)`;
  }
  return null;
}

function firstMatchingLine(lines, pattern) {
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? null : index + 1;
}

function findContentIssues(path, content) {
  const lines = content.split('\n');
  const issues = [];
  const conflictLine = firstMatchingLine(lines, CONFLICT_MARKER);
  if (conflictLine) issues.push(`merge conflict marker at line ${conflictLine}`);
  if (TEST_FILE.test(path)) {
    const focusedLine = firstMatchingLine(lines, FOCUSED_TEST);
    if (focusedLine) issues.push(`focused test (.only / fit) at line ${focusedLine}`);
  }
  return issues;
}

function lintableFiles(paths) {
  return paths.filter((path) => LINTABLE.test(path));
}

function git(args) {
  return execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
}

function stagedPaths() {
  return git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'])
    .toString()
    .split('\0')
    .filter(Boolean);
}

function stagedContent(path) {
  const buffer = git(['show', `:${path}`]);
  return buffer.includes(0) ? null : buffer.toString('utf8');
}

async function lintStaged(paths) {
  const files = lintableFiles(paths);
  if (files.length === 0) return [];
  const { ESLint } = require('eslint');
  const eslint = new ESLint();
  const problems = [];
  for (const path of files) {
    if (await eslint.isPathIgnored(path)) continue;
    const [result] = await eslint.lintText(stagedContent(path) ?? '', { filePath: path });
    for (const message of result.messages.filter((m) => m.severity === 2)) {
      problems.push(`${path}:${message.line}:${message.column} ${message.message} (${message.ruleId ?? 'parse'})`);
    }
  }
  return problems;
}

async function main() {
  const paths = stagedPaths();
  const problems = [];

  for (const path of paths) {
    const size = Number(git(['cat-file', '-s', `:${path}`]).toString().trim());
    const blocked = findBlockedPath(path, size);
    if (blocked) {
      problems.push(`${path}: ${blocked}`);
      continue;
    }
    if (size > MAX_SCANNED_BYTES) continue;
    const content = stagedContent(path);
    if (content == null) continue;
    for (const issue of findContentIssues(path, content)) problems.push(`${path}: ${issue}`);
  }

  if (problems.length === 0) problems.push(...(await lintStaged(paths)));

  if (problems.length > 0) {
    console.error('\npre-commit: commit blocked\n');
    for (const problem of problems) console.error(`  ✖ ${problem}`);
    console.error('\nFix the above, or bypass with `git commit --no-verify` if intentional.\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('pre-commit: staged check crashed', error);
    process.exit(1);
  });
}

module.exports = { MAX_FILE_BYTES, findBlockedPath, findContentIssues, lintableFiles };

#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename, dirname, relative } from "node:path";
import { createInterface } from "node:readline";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface Config {
  name: string;          // PascalCase project name (PROJECT_NAME)
  bundleId: string;      // BUNDLE_ID
  dbName: string;        // DB_NAME
  backendPort: string;   // BACKEND_PORT
  dbPort: string;        // DB_PORT
  teamId: string;        // TEAM_ID
  apiDomain: string;     // API_DOMAIN
  repoName: string;      // REPO_NAME (derived from output dir name if not set)
  vpsHomeUser: string;   // VPS_HOME_USER
  vpsDeployerUser: string; // VPS_DEPLOYER_USER
  output: string;        // Target directory
}

const TEMPLATE_DIR = join(import.meta.dir, "template");

const PLACEHOLDER_FILENAME = "__PROJECT_NAME__";

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

function parseArgs(): Partial<Config> {
  const args = process.argv.slice(2);
  const config: Partial<Config> = {};

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case "--name":        config.name = next; i++; break;
      case "--bundle-id":   config.bundleId = next; i++; break;
      case "--db-name":     config.dbName = next; i++; break;
      case "--backend-port": config.backendPort = next; i++; break;
      case "--db-port":     config.dbPort = next; i++; break;
      case "--team-id":     config.teamId = next; i++; break;
      case "--api-domain":  config.apiDomain = next; i++; break;
      case "--repo-name":   config.repoName = next; i++; break;
      case "--vps-home-user": config.vpsHomeUser = next; i++; break;
      case "--vps-deployer-user": config.vpsDeployerUser = next; i++; break;
      case "--output":      config.output = next; i++; break;
    }
  }

  return config;
}

function printUsage() {
  console.log(`
Blueprint Scaffold — Create a new iOS + Backend monorepo

Usage:
  bun run scaffold.ts [options]

Required options:
  --name <PascalCase>       Project name (e.g., FindMyPlus)
  --bundle-id <id>          Bundle identifier (e.g., com.cassmtnr.findmyplus)
  --db-name <name>          Database name (e.g., findmyplus)
  --backend-port <port>     Backend host port (e.g., 4000)
  --db-port <port>          PostgreSQL host port (e.g., 5433)
  --team-id <id>            Apple Developer Team ID (e.g., 58N4UVGANT)
  --api-domain <domain>     Production API domain (e.g., api.findmyplus.example.com)
  --output <path>           Target directory for the new project

Optional:
  --repo-name <name>        Repo name in kebab-case (defaults to output directory name)
  --vps-home-user <user>    VPS user that owns the app directory (e.g., tars)
  --vps-deployer-user <user> VPS user with deploy-only permissions (e.g., deployer)
  --help, -h                Show this help message

Example:
  bun run scaffold.ts \\
    --name FindMyPlus \\
    --bundle-id com.cassmtnr.findmyplus \\
    --db-name findmyplus \\
    --backend-port 4000 \\
    --db-port 5433 \\
    --team-id 58N4UVGANT \\
    --api-domain api.findmyplus.example.com \\
    --output ~/Dev/find-my-plus

If any required option is missing, the script will prompt interactively.
`);
}

// ---------------------------------------------------------------------------
// Interactive Prompts
// ---------------------------------------------------------------------------

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

async function fillMissing(partial: Partial<Config>): Promise<Config> {
  const name = partial.name || await prompt("Project name (PascalCase)");
  const bundleId = partial.bundleId || await prompt("Bundle ID", `com.cassmtnr.${name.toLowerCase()}`);
  const dbName = partial.dbName || await prompt("Database name", name.toLowerCase());
  const backendPort = partial.backendPort || await prompt("Backend port", "4000");
  const dbPort = partial.dbPort || await prompt("PostgreSQL port", "5433");
  const teamId = partial.teamId || await prompt("Apple Team ID (e.g., 58N4UVGANT)");
  const apiDomain = partial.apiDomain || await prompt("API domain", `api.${name.toLowerCase()}.example.com`);
  const vpsHomeUser = partial.vpsHomeUser || await prompt("VPS home user (owns app directory)");
  const vpsDeployerUser = partial.vpsDeployerUser || await prompt("VPS deployer user (deploy-only permissions)", "deployer");
  const output = partial.output || await prompt("Output directory", `~/Dev/${toKebabCase(name)}`);

  // Expand ~ in output path
  const resolvedOutput = output.replace(/^~/, process.env.HOME || "");

  const repoName = partial.repoName || basename(resolvedOutput);

  if (!name) { console.error("Error: --name is required"); process.exit(1); }
  if (!bundleId) { console.error("Error: --bundle-id is required"); process.exit(1); }
  if (!dbName) { console.error("Error: --db-name is required"); process.exit(1); }
  if (!backendPort) { console.error("Error: --backend-port is required"); process.exit(1); }
  if (!dbPort) { console.error("Error: --db-port is required"); process.exit(1); }
  if (!teamId) { console.error("Error: --team-id is required"); process.exit(1); }
  if (!apiDomain) { console.error("Error: --api-domain is required"); process.exit(1); }
  if (!resolvedOutput) { console.error("Error: --output is required"); process.exit(1); }

  return { name, bundleId, dbName, backendPort, dbPort, teamId, apiDomain, repoName, vpsHomeUser, vpsDeployerUser, output: resolvedOutput };
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isPascalCase(str: string): boolean {
  return /^[A-Z][a-zA-Z0-9]+$/.test(str);
}

function isNumericPort(str: string): boolean {
  const n = Number(str);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

function validate(config: Config): void {
  const errors: string[] = [];

  if (!isPascalCase(config.name)) {
    errors.push(`--name must be PascalCase (e.g., FindMyPlus). Got: "${config.name}"`);
  }
  if (!isNumericPort(config.backendPort)) {
    errors.push(`--backend-port must be a number between 1 and 65535. Got: "${config.backendPort}"`);
  }
  if (!isNumericPort(config.dbPort)) {
    errors.push(`--db-port must be a number between 1 and 65535. Got: "${config.dbPort}"`);
  }

  if (errors.length > 0) {
    for (const err of errors) console.error(`Error: ${err}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Template Processing
// ---------------------------------------------------------------------------

function replacePlaceholders(content: string, config: Config): string {
  return content
    .replaceAll("{{PROJECT_NAME}}", config.name)
    .replaceAll("{{BUNDLE_ID}}", config.bundleId)
    .replaceAll("{{DB_NAME}}", config.dbName)
    .replaceAll("{{BACKEND_PORT}}", config.backendPort)
    .replaceAll("{{DB_PORT}}", config.dbPort)
    .replaceAll("{{TEAM_ID}}", config.teamId)
    .replaceAll("{{API_DOMAIN}}", config.apiDomain)
    .replaceAll("{{REPO_NAME}}", config.repoName)
    .replaceAll("{{VPS_HOME_USER}}", config.vpsHomeUser)
    .replaceAll("{{VPS_DEPLOYER_USER}}", config.vpsDeployerUser);
}

function resolveFilename(name: string, projectName: string): string {
  return name.replaceAll(PLACEHOLDER_FILENAME, projectName);
}

/** Recursively collects all files in `dir`, including dotfiles (.env, .gitignore, .claude/, etc.). */
function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  // { withFileTypes: false } is the default — readdirSync includes dotfiles (entries starting with '.')
  // unlike shell globs which skip them. This is intentional: the template contains .env.example,
  // .gitignore, .claude/, and .github/ which must all be copied.
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...getAllFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const partial = parseArgs();
  const config = await fillMissing(partial);
  validate(config);

  // Validate output doesn't already exist (or is empty)
  if (existsSync(config.output)) {
    const entries = readdirSync(config.output);
    if (entries.length > 0) {
      console.error(`Error: Output directory "${config.output}" already exists and is not empty.`);
      process.exit(1);
    }
  }

  console.log("\nScaffolding project...");
  console.log(`  Name:         ${config.name}`);
  console.log(`  Bundle ID:    ${config.bundleId}`);
  console.log(`  DB Name:      ${config.dbName}`);
  console.log(`  Backend Port: ${config.backendPort}`);
  console.log(`  DB Port:      ${config.dbPort}`);
  console.log(`  Team ID:      ${config.teamId}`);
  console.log(`  API Domain:   ${config.apiDomain}`);
  console.log(`  Repo Name:    ${config.repoName}`);
  console.log(`  VPS Home:     ${config.vpsHomeUser}`);
  console.log(`  VPS Deployer: ${config.vpsDeployerUser}`);
  console.log(`  Output:       ${config.output}`);
  console.log();

  // 1. Collect all template files
  const templateFiles = getAllFiles(TEMPLATE_DIR);
  let fileCount = 0;

  for (const srcPath of templateFiles) {
    const relPath = relative(TEMPLATE_DIR, srcPath);

    // Resolve __PROJECT_NAME__ in path segments
    const resolvedRelPath = relPath
      .split("/")
      .map((segment) => resolveFilename(segment, config.name))
      .join("/");

    const destPath = join(config.output, resolvedRelPath);

    // Create parent directory
    mkdirSync(dirname(destPath), { recursive: true });

    // Read, replace placeholders, write
    const content = readFileSync(srcPath, "utf-8");
    const processed = replacePlaceholders(content, config);
    writeFileSync(destPath, processed);
    fileCount++;
  }

  console.log(`Created ${fileCount} files in ${config.output}\n`);

  // 2. Print next steps
  const p = config.output;
  console.log("Next steps:");
  console.log("─".repeat(50));
  console.log(`
  1. Install backend dependencies:
     cd ${p}/backend && bun install

  2. Copy .env.example files and fill in secrets:
     cd ${p}
     cp .env.example .env
     cp backend/.env.example backend/.env

  3. Start PostgreSQL:
     cd ${p} && docker compose up db -d

  4. Create the test database:
     cd ${p} && docker compose exec db createdb -U ${config.dbName} ${config.dbName}_test

  5. Apply schema to both databases:
     cd ${p}/backend
     bun run db:push
     DATABASE_URL="postgresql://${config.dbName}:YOUR_PASSWORD@localhost:${config.dbPort}/${config.dbName}_test" bun run db:push

  6. Run tests:
     cd ${p}/backend && bun run test

  7. Start the backend:
     cd ${p}/backend && bun run dev

  8. Generate the Xcode project:
     cd ${p}/app && xcodegen generate

  9. Open in Xcode:
     cd ${p}/app && open ${config.name}.xcodeproj
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

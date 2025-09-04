import * as cp from "node:child_process";
import * as fs from "node:fs";
import { add_overrides } from "./add-overrides";
import { dup } from "./dup.js";

if (process.argv[2] === "-h" || process.argv[2] === "--help") {
	console.log();
	console.log("  Description");
	console.log("    Find duplicates in npm/pnpm/yarn lockfile");
	console.log();
	console.log("  Usage");
	console.log("    $ dup [dir]");
	console.log();
	process.exit(0);
}

if (process.argv[2] === "-v" || process.argv[2] === "--version") {
	const pkg = JSON.parse(
		fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
	);
	console.log(`${pkg.name}, ${pkg.version}`);
	process.exit(0);
}

const dir = process.argv[2];
if (dir && fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory())
	process.chdir(dir);

let found = false;
const lockfiles = [
	"pnpm-lock.yaml",
	"package-lock.json",
	"yarn.lock",
	"bun.lock",
	"bun.lockb",
];
for (const lockfile of lockfiles)
	if (fs.existsSync(lockfile)) {
		let raw: string;
		if (lockfile === "bun.lockb") {
			raw = cp.execFileSync("bun", [lockfile], { encoding: "utf-8" });
		} else {
			raw = fs.readFileSync(lockfile, "utf8");
		}
		const duplicates = dup(raw);

		for (const name in duplicates)
			for (const version of duplicates[name]) console.log(`${name}@${version}`);

		if (process.env.DUP_EVIL) add_overrides(lockfile, duplicates);

		found = true;

		break;
	}

if (!found) console.log("Not found any lockfile here.");

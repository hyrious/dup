import * as fs from "node:fs";
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

if (process.argv[2] === "-v") {
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
for (const lockfile of ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"])
	if (fs.existsSync(lockfile)) {
		const duplicates = dup(fs.readFileSync(lockfile, "utf8"));

		for (const name in duplicates)
			for (const version of duplicates[name]) console.log(`${name}@${version}`);

		found = true;
		break;
	}

if (!found) console.log("Not found any lockfile here.");

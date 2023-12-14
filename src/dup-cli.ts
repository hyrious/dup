import * as fs from "node:fs";
import { dup } from "./dup";

if (process.argv[2] === "-v") {
	const pkg = JSON.parse(
		fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
	);
	console.log(`${pkg.name}, ${pkg.version}`);
	process.exit(0);
}

for (const lockfile of ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"])
	if (fs.existsSync(lockfile)) {
		const duplicates = dup(fs.readFileSync(lockfile, "utf8"));
		for (const name in duplicates)
			for (const version of duplicates[name]) console.log(`${name}@${version}`);

		break;
	}

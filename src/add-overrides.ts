import * as fs from "node:fs";
import { sortJSON } from "@hyrious/sort-package-json";
import semiver from "semiver";

/**
 * Edit package.json or pnpm-workspace.yaml to add overrides.
 */
export function add_overrides(
	lockfile: string,
	duplicates: { [x: string]: string[] },
): void {
	let empty = true;
	const overrides: { [x: string]: string } = {};
	for (const name in duplicates) {
		overrides[name] = duplicates[name].sort(semiver).pop()!;
		empty = false;
	}
	if (empty) {
		console.log("Nothing to override.");
		return;
	}

	if (lockfile === "pnpm-lock.yaml") {
		if (fs.existsSync("pnpm-workspace.yaml")) {
			edit_yaml("pnpm-workspace.yaml", overrides);
		} else {
			edit_json("package.json", ["pnpm", "overrides"], overrides);
		}
	} else if (lockfile === "yarn.lock") {
		edit_json("package.json", ["resolutions"], overrides);
	} else {
		edit_json("package.json", ["overrides"], overrides);
	}
}

function edit_json(
	file: string,
	path: string[],
	overrides: { [x: string]: string },
): void {
	// The file must exist because we found a lockfile.
	const pkg = JSON.parse(fs.readFileSync(file, "utf8"));

	let obj = pkg;
	for (let i = 0; i < path.length; i++) {
		const key = path[i];
		if (obj[key] == null) obj[key] = {};
		obj = obj[key];
	}

	// `overrides` must not be empty.
	let updated = false;
	for (const name in overrides) {
		if (obj[name] !== overrides[name]) {
			obj[name] = overrides[name];
			updated = true;
			console.log(`Add override: ${name}@${overrides[name]}`);
		}
	}
	if (updated) fs.writeFileSync(file, sortJSON(pkg), "utf8");
}

function edit_yaml(file: string, overrides: { [x: string]: string }): void {
	const contents = ["overrides:"];
	for (const name in overrides) {
		contents.push(`  "${name}": "${overrides[name]}"`);
	}
	console.log("Editing YAML files is not supported yet.");
	console.log(`Please add the following lines to "${file}":`);
	console.log(contents.join("\n"));
}

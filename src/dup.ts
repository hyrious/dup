import { parse } from "./jsonc";

/**
 * Find duplicates in the lockfile content.
 * @param lockfile The contents of pnpm-lock.yaml / package-lock.json, etc.
 * @example
 * let duplicates = dup(fs.readFileSync('pnpm-lock.yaml', 'utf8'))
 * let duplicates = dup(require('./package-lock.json'))
 * console.log(duplicates) //=> { "foo": ["1.0.0", "2.0.0"] }
 */
export function dup(lockfile: unknown): { [name: string]: string[] } {
	if (typeof lockfile === "object" && lockfile !== null) {
		return dup_object(lockfile as Lockfile);
	}
	if (typeof lockfile === "string") {
		return dup_string(lockfile);
	}
	throw new Error(
		`expect string or object, got ${lockfile && typeof lockfile}`,
	);
}

interface Lockfile {
	// NPM / PNPM / Bun
	readonly lockfileVersion: string;
	//  NPM: key is "" (self) or "node_modules/{pkg}..." (matching file system)
	// PNPM: key is "/{pkg}@{version}(...)" (v6) or "{pkg}@{version}(...)" (v9)
	//  Bun: key is "{pkg}", "{pkg}/{duplicated-pkg}" (version in value)
	readonly packages: { readonly [key: string]: unknown };
	// Yarn: its root keys are "name@spec, name@spec2", name "__metadata" is reserved
	//       so PNPM v9 can be conflict with Yarn's lockfile
	//       value is { version: "resolved version" }
	readonly [key: string]: unknown;
}

function dup_object(a: Lockfile) {
	return dup_packages(a.lockfileVersion ? a.packages : a);
}

function dup_value_is_array(p: { readonly [key: string]: unknown }) {
	for (const key in p) {
		if (Array.isArray(p[key])) return true;
		return false;
	}
	return false;
}

function dup_packages(p: { readonly [key: string]: unknown }) {
	const isNPM = !!p[""];
	const isBun = dup_value_is_array(p);
	const collected: [pkg: string, ver: string][] = [];
	for (const key in p) {
		let pkg: string;
		let ver: string;

		// NPM: "node_modules/path/to/{package-name}": { "version": {version} }
		if (isNPM && key) {
			const parts = key.split("/").slice(-2);
			if (parts[0][0] === "@") {
				pkg = parts.join("/");
			} else {
				pkg = parts.pop()!;
			}
			ver = (p[key] as { version: string }).version;
			if (ver == null) continue;
			collected.push([pkg, ver]);
		}

		// Bun: "{consumer}/{package-name}": ["{package-name}@{version}", ...]
		else if (isBun && key) {
			const parts = key.split("/").slice(-2);
			if (parts[0][0] === "@") {
				pkg = parts.join("/");
			} else {
				pkg = parts.pop()!;
			}
			const line = (p[key] as string[])[0];
			const i = line.indexOf("@", 1);
			collected.push([pkg, line.slice(i + 1)]);
		}

		// PNPM and Yarn: pkg@ver, pkg@spec, 'pkg@ver', "pkg@spec", /pkg@ver
		else if (key) {
			let line = key;
			// Skip ' "
			if (line[0] === '"' || line[0] === "'") line = line.slice(1);
			// Skip /
			if (line[0] === "/") line = line.slice(1);
			// Consume pkg name, pkg[@]ver
			const i = line.indexOf("@", 1);
			pkg = line.slice(0, i);
			// Consume pkg version or spec
			line = line.slice(i + 1);
			const match = line.match(/['",(:]/);
			ver = match ? line.slice(0, match.index) : line;
			// If the value has version, use that one (so current 'ver' is a spec)
			const another = (p[line] as { version?: string }).version;
			if (another) ver = another;
			collected.push([pkg, ver]);
		}
	}
	return dup_collected(collected);
}

function dup_string(a: string) {
	if (a[0] === "{") return dup_object(parse(a));
	const collected: [pkg: string, ver: string][] = [];
	// PNPM
	if (a.startsWith("lockfileVersion")) {
		const lines = a.split(/\r\n|\n/g);
		let working = false;
		for (let index = 0; index < lines.length; ++index) {
			let line = lines[index];
			if (line) {
				if (line[0] !== " ") working = line.startsWith("packages:");
				else if (working && line[2] && line[2] !== " ") {
					// Skip leading spaces
					line = line.slice(2);
					// Skip ' "
					if (line[0] === '"' || line[0] === "'") line = line.slice(1);
					// Skip /
					if (line[0] === "/") line = line.slice(1);
					// Extract pkg name
					const i = line.indexOf("@", 1);
					const pkg = line.slice(0, i);
					// Extract version
					line = line.slice(i + 1);
					const match = line.match(/['",(:]/);
					const ver = match ? line.slice(0, match.index) : line;
					collected.push([pkg, ver]);
				}
			}
		}
	}
	// Yarn
	else if (a.includes("yarn lockfile") || a.includes("__metadata")) {
		const lines = a.split(/\r\n|\n/g);
		for (let index = 0; index < lines.length; ++index) {
			const line = lines[index];
			if (line.length && line[0] !== " ") {
				const quoted = line[0] === '"';
				const i = line.indexOf("@", quoted ? 2 : 1);
				const pkg = line.slice(quoted ? 1 : 0, i);
				let ver: string | undefined;
				const version = lines[index + 1];
				if (version.startsWith("  version")) {
					if (version[9] === " ") {
						ver = version.slice(10); // Yarn 1
					} else if (version[9] === ":") {
						ver = version.slice(11); // Yarn 2+
					}
					if (ver && ver[0] === '"') ver = ver.slice(1, -1);
					if (ver) collected.push([pkg, ver]);
				}
			}
		}
	}
	return dup_collected(collected);
}

function dup_collected(collected: [pkg: string, ver: string][]) {
	const map = new Map<string, Set<string>>();
	for (const [name, version] of collected) {
		if (map.has(name)) {
			map.get(name)!.add(version);
		} else {
			map.set(name, new Set([version]));
		}
	}
	const result: { [name: string]: string[] } = Object.create(null);
	for (const name of map.keys()) {
		const versions = map.get(name)!;
		if (versions.size > 1) {
			result[name] = Array.from(versions);
		}
	}
	return result;
}

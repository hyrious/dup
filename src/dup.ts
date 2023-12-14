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
	// NPM / PNPM
	readonly lockfileVersion: string;
	//  NPM: key is "" (self) or "node_modules/{pkg}..." (matching file system)
	// PNPM: key is "/{pkg}@{version}"
	readonly packages: { readonly [key: string]: unknown };
	// Yarn: its root keys are "name@spec, name@spec2", name "__metadata" is reserved
	//       value is { version: "resolved version" }
	readonly [key: string]: unknown;
}

function dup_object(a: Lockfile) {
	return dup_packages(a.lockfileVersion ? a.packages : a);
}

function dup_packages(p: { readonly [key: string]: unknown }) {
	const collected: [pkg: string, ver: string][] = [];
	for (const key in p) {
		if (key.startsWith("node_modules/")) {
			const i = key.lastIndexOf("node_modules/");
			const pkg = key.slice(i + 13);
			const ver = (p[key] as { version: string }).version;
			collected.push([pkg, ver]);
		} else if (key.startsWith("/")) {
			const i = key.lastIndexOf("@");
			const pkg = key.slice(1, i);
			const ver = key.slice(i + 1);
			collected.push([pkg, ver]);
		} else if (key.includes("@")) {
			const i = key.indexOf("@", 1);
			const pkg = key.slice(0, i);
			const ver = (p[key] as { version: string }).version;
			collected.push([pkg, ver]);
		}
	}
	return dup_collected(collected);
}

function dup_string(a: string) {
	if (a[0] === "{") return dup_object(JSON.parse(a));
	const collected: [pkg: string, ver: string][] = [];
	// PNPM
	if (a.startsWith("lockfileVersion")) {
		const re = /^ {2}\/(.+):$/gm;
		let match: RegExpMatchArray | null;
		do {
			match = re.exec(a);
			if (match) {
				const key = match[1];
				const i = key.indexOf("@", 1);
				const pkg = key.slice(0, i);
				const j = key.indexOf("(", i);
				const ver = key.slice(i + 1, j >= 0 ? j : void 0);
				collected.push([pkg, ver]);
			}
		} while (match);
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
					if (version[10] === " ") ver = version.slice(10); // Yarn 1
					else if (version[10] === ":") ver = version.slice(11); // Yarn 2+
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

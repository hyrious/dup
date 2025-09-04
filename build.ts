import * as fs from "node:fs";
import * as dts from "@hyrious/dts";
import * as esbuild from "esbuild";

fs.rmSync("dist", { recursive: true, force: true });

await esbuild
	.build({
		entryPoints: ["src/dup.ts", "src/dup-cli.ts"],
		bundle: true,
		platform: "node",
		mainFields: ["module", "main"],
		format: "esm",
		outdir: "dist",
		logLevel: "info",
		plugins: [
			{
				name: "cli",
				setup({ onResolve, onLoad }) {
					onResolve({ filter: /^\.\/.+\.js$/ }, (args) => {
						return { path: args.path, external: true };
					});
					onLoad({ filter: /\-cli\.ts$/ }, (args) => {
						const code = fs.readFileSync(args.path, "utf8");
						return {
							contents: `#!/usr/bin/env node\n${code}`,
							loader: "default",
						};
					});
				},
			},
		],
	})
	.catch(() => process.exit(1));

const { elapsed } = await dts.build({ entryPoints: ["src/dup.ts"] });
console.log("✅ DTS built in", (elapsed / 1000).toFixed(2), "s");

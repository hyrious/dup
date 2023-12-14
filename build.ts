import * as fs from "node:fs";
import * as esbuild from "esbuild";
import * as dts from "@hyrious/dts";

await esbuild
	.build({
		entryPoints: ["src/dup.ts", "src/dup-cli.ts"],
		bundle: true,
		platform: "node",
		format: "esm",
		splitting: true,
		outdir: "dist",
		logLevel: "info",
		plugins: [
			{
				name: "shebang",
				setup({ onLoad }) {
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

const { elapsed } = await dts.build("src/dup.ts", "dist/dup.d.ts");
console.log("✅ DTS built in", (elapsed / 1000).toFixed(2), "s");

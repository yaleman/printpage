import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const templateDir = path.join(repoRoot, "printpage", "templates");
const staticDir = path.join(repoRoot, "printpage", "static");
const favicons = await readFile(path.join(templateDir, "favicons.html"), "utf8");
const port = Number(process.argv[2] ?? "4173");

const contentTypes = new Map([
	[".css", "text/css; charset=utf-8"],
	[".html", "text/html; charset=utf-8"],
	[".js", "application/javascript; charset=utf-8"],
	[".png", "image/png"],
	[".svg", "image/svg+xml"],
]);

async function renderTemplate(templateName) {
	const source = await readFile(path.join(templateDir, templateName), "utf8");
	return source.replace('{% include "favicons.html" %}', favicons);
}

const routes = new Map([
	["/", () => renderTemplate("index.html")],
	["/config", () => renderTemplate("config.html")],
]);

const server = createServer(async (request, response) => {
	const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
	const routeHandler = routes.get(requestUrl.pathname);
	if (routeHandler) {
		response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
		response.end(await routeHandler());
		return;
	}

	if (requestUrl.pathname.startsWith("/static/")) {
		const relativePath = requestUrl.pathname.replace("/static/", "");
		const filePath = path.join(staticDir, relativePath);
		try {
			const file = await readFile(filePath);
			const extension = path.extname(filePath);
			response.writeHead(200, {
				"content-type":
					contentTypes.get(extension) ?? "application/octet-stream",
			});
			response.end(file);
			return;
		} catch {
			response.writeHead(404);
			response.end("Not found");
			return;
		}
	}

	response.writeHead(404);
	response.end("Not found");
});

server.listen(port, "127.0.0.1", () => {
	console.log(`Static app server listening on ${port}`);
});

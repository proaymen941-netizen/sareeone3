// server/viteServer.ts
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Dynamic import — لا يُحمَّل في الإنتاج
  const vite = await import("vite");

  const serverOptions = {
    middlewareMode: true,
    hmr: process.env.DISABLE_HMR === 'true' ? false : {
      server,
      clientPort: 443,
    },
    allowedHosts: true as true,
  };

  const viteServer = await vite.createServer({
    configFile: path.resolve(__dirname, "..", "vite.config.ts"),
    server: serverOptions,
    appType: "custom",
    root: path.resolve(__dirname, "..", "client"),
  });

  app.use(viteServer.middlewares);
  app.use("*", async (req: any, res: any, next: any) => {
    const url = req.originalUrl;
    try {
      // Try client/index.html first, then root index.html
      let clientTemplate: string;
      const clientIndexPath = path.resolve(__dirname, "..", "client", "index.html");
      const rootIndexPath = path.resolve(__dirname, "..", "index.html");
      if (fs.existsSync(clientIndexPath)) {
        clientTemplate = clientIndexPath;
      } else {
        clientTemplate = rootIndexPath;
      }
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await viteServer.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      viteServer.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // في الإنتاج، الملفات في dist/public (نسبة إلى dist/index.js)
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(`Build directory not found: ${distPath}`);
    console.error("Please run 'npm run build' first");
    // لا نُوقف الخادم — نُكمل بدون ملفات ثابتة
    app.use("*", (_req, res) => {
      res.status(503).send(`
        <html><body>
          <h1>الخادم يعمل ولكن الملفات لم تُبنَ بعد</h1>
          <p>Server is running but frontend build is missing. Run 'npm run build'.</p>
        </body></html>
      `);
    });
    return;
  }

  // تحديد أنواع MIME الصريحة للأيقونات والملفات الثابتة
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.ico')) {
        res.setHeader('Content-Type', 'image/x-icon');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      } else if (filePath.endsWith('.webmanifest') || filePath.endsWith('manifest.json')) {
        res.setHeader('Content-Type', 'application/manifest+json');
      }
    }
  }));

  // كل الطلبات الأخرى تُرجع index.html (SPA routing)
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("index.html not found");
    }
  });
}

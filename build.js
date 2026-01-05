#!/usr/bin/env node
/**
 * YouTube DJ Mixer - Build Script
 * Minifie les JS et prépare le dossier build pour la production
 */

const fs = require("fs");
const path = require("path");
const { minify } = require("terser");

const VERSION = "3.42";
const BUILD_DIR = "build";
const JS_DIR = "js";
const CSS_DIR = "css";

// Ordre des fichiers JS (important pour les dépendances)
const JS_FILES = [
  "state.js",
  "storage.js",
  "tv.js",
  "lastfm.js",
  "youtube.js",
  "player.js",
  "playlist.js",
  "mixer.js",
  "suggestions.js",
  "ui.js",
  "vu-meter.js",
  "app.js",
];

const TV_JS_FILES = ["tv-page.js"];

async function build() {
  console.log("Build YouTube DJ Mixer v" + VERSION);
  console.log("================================\n");

  // Créer les dossiers
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmdirSync(BUILD_DIR, { recursive: true });
  }
  fs.mkdirSync(BUILD_DIR);
  fs.mkdirSync(path.join(BUILD_DIR, "js"));
  fs.mkdirSync(path.join(BUILD_DIR, "css"));

  // Minifier les JS principaux en un seul fichier
  console.log("Minification JS...");
  let combinedJs = "";
  for (const file of JS_FILES) {
    const filePath = path.join(JS_DIR, file);
    if (fs.existsSync(filePath)) {
      combinedJs += fs.readFileSync(filePath, "utf8") + "\n";
      console.log("  + " + file);
    }
  }

  const minifiedMain = await minify(combinedJs, {
    compress: true,
    mangle: true,
    output: { comments: false },
  });
  fs.writeFileSync(path.join(BUILD_DIR, "js", "app.min.js"), minifiedMain.code);
  console.log(
    "  -> js/app.min.js (" +
      Math.round(minifiedMain.code.length / 1024) +
      " KB)\n",
  );

  // Minifier tv-page.js séparément
  console.log("Minification TV JS...");
  for (const file of TV_JS_FILES) {
    const filePath = path.join(JS_DIR, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      const minified = await minify(content, {
        compress: true,
        mangle: true,
        output: { comments: false },
      });
      const outName = file.replace(".js", ".min.js");
      fs.writeFileSync(path.join(BUILD_DIR, "js", outName), minified.code);
      console.log(
        "  + " +
          file +
          " -> " +
          outName +
          " (" +
          Math.round(minified.code.length / 1024) +
          " KB)",
      );
    }
  }
  console.log("");

  // Minifier CSS
  console.log("Minification CSS...");
  const cssFiles = fs.readdirSync(CSS_DIR).filter((f) => f.endsWith(".css"));
  for (const file of cssFiles) {
    const content = fs.readFileSync(path.join(CSS_DIR, file), "utf8");
    // Minification CSS simple
    const minified = content
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments
      .replace(/\s+/g, " ") // Collapse whitespace
      .replace(/\s*([{}:;,])\s*/g, "$1") // Remove spaces around symbols
      .replace(/;}/g, "}") // Remove last semicolon
      .trim();
    const outName = file.replace(".css", ".min.css");
    fs.writeFileSync(path.join(BUILD_DIR, "css", outName), minified);
    console.log(
      "  + " +
        file +
        " -> " +
        outName +
        " (" +
        Math.round(minified.length / 1024) +
        " KB)",
    );
  }
  console.log("");

  // Générer index.html pour le build
  console.log("Génération HTML...");
  let indexHtml = fs.readFileSync("index.html", "utf8");

  // Remplacer les scripts multiples par le bundle
  const scriptRegex =
    /<!-- Modules JS -->[\s\S]*?<script src="js\/app\.js\?v=[\d.]+"><\/script>/;
  indexHtml = indexHtml.replace(
    scriptRegex,
    '<script src="js/app.min.js?v=' + VERSION + '"></script>',
  );

  // Mettre à jour le chemin CSS
  indexHtml = indexHtml.replace(
    /css\/style\.css\?v=[\d.]+/,
    "css/style.min.css?v=" + VERSION,
  );

  fs.writeFileSync(path.join(BUILD_DIR, "index.html"), indexHtml);
  console.log("  + index.html\n");

  // Générer tv.html pour le build
  let tvHtml = fs.readFileSync("tv.html", "utf8");
  tvHtml = tvHtml.replace(
    /css\/tv\.css\?v=[\d.]+/,
    "css/tv.min.css?v=" + VERSION,
  );
  tvHtml = tvHtml.replace(
    /js\/tv-page\.js\?v=[\d.]+/,
    "js/tv-page.min.js?v=" + VERSION,
  );
  fs.writeFileSync(path.join(BUILD_DIR, "tv.html"), tvHtml);
  console.log("  + tv.html\n");

  // Stats finales
  console.log("Build terminé !");
  console.log("---------------");
  const buildFiles = getAllFiles(BUILD_DIR);
  let totalSize = 0;
  buildFiles.forEach((f) => {
    const size = fs.statSync(f).size;
    totalSize += size;
  });
  console.log("Fichiers: " + buildFiles.length);
  console.log("Taille totale: " + Math.round(totalSize / 1024) + " KB\n");
}

function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

build().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});

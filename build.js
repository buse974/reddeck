#!/usr/bin/env node
/**
 * RedDeck - Build Script
 * Minifie les JS et prépare le dossier build pour la production
 */

const fs = require("fs");
const path = require("path");
const { minify } = require("terser");

const VERSION = "3.42";
const SRC_DIR = "src";
const DIST_DIR = "dist";
const JS_DIR = path.join(SRC_DIR, "js");
const CSS_DIR = path.join(SRC_DIR, "css");

// Ordre des fichiers JS (important pour les dépendances)
const JS_FILES = [
  "env-loader.js",
  "config.js",
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
  "faders.js",
  "app.js",
];

const TV_JS_FILES = ["tv-page.js"];

async function build() {
  console.log("Build RedDeck v" + VERSION);
  console.log("================================\n");

  // Créer les dossiers
  if (fs.existsSync(DIST_DIR)) {
    deleteFolderRecursive(DIST_DIR);
  }
  fs.mkdirSync(DIST_DIR);
  fs.mkdirSync(path.join(DIST_DIR, "app"));
  fs.mkdirSync(path.join(DIST_DIR, "app", "js"));
  fs.mkdirSync(path.join(DIST_DIR, "app", "css"));

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
  fs.writeFileSync(
    path.join(DIST_DIR, "app", "js", "app.min.js"),
    minifiedMain.code,
  );
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
      fs.writeFileSync(
        path.join(DIST_DIR, "app", "js", outName),
        minified.code,
      );
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
    fs.writeFileSync(path.join(DIST_DIR, "app", "css", outName), minified);
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

  // Générer index.html pour le build (depuis app/index.html)
  console.log("Génération HTML...");
  let appHtml = fs.readFileSync(path.join(SRC_DIR, "index.html"), "utf8");

  // Remplacer les scripts multiples par le bundle
  const scriptRegex =
    /<!-- Configuration & Env -->[\s\S]*?<script src="js\/app\.js\?v=[\d.]+"><\/script>/;
  appHtml = appHtml.replace(
    scriptRegex,
    '<script src="js/app.min.js?v=' + VERSION + '"></script>',
  );

  // Mettre à jour le chemin CSS
  appHtml = appHtml.replace(
    /css\/style\.css\?v=[\d.]+/,
    "css/style.min.css?v=" + VERSION,
  );

  fs.writeFileSync(path.join(DIST_DIR, "app", "index.html"), appHtml);
  console.log("  + app/index.html\n");

  // Générer tv.html pour le build
  let tvHtml = fs.readFileSync(path.join(SRC_DIR, "tv.html"), "utf8");
  tvHtml = tvHtml.replace(
    /css\/tv\.css\?v=[\d.]+/,
    "css/tv.min.css?v=" + VERSION,
  );
  tvHtml = tvHtml.replace(
    /js\/tv-page\.js\?v=[\d.]+/,
    "js/tv-page.min.js?v=" + VERSION,
  );
  fs.writeFileSync(path.join(DIST_DIR, "app", "tv.html"), tvHtml);
  console.log("  + app/tv.html\n");

  // Copier la landing page à la racine
  console.log("Copie landing page...");
  const landingDir = "landing";
  if (fs.existsSync(landingDir)) {
    const landingFiles = fs.readdirSync(landingDir);
    for (const file of landingFiles) {
      const src = path.join(landingDir, file);
      const dest = path.join(DIST_DIR, file);
      fs.copyFileSync(src, dest);
      console.log("  + " + file);
    }
  }
  console.log("");

  // Stats finales
  console.log("Build terminé !");
  console.log("---------------");
  const buildFiles = getAllFiles(DIST_DIR);
  let totalSize = 0;
  buildFiles.forEach((f) => {
    const size = fs.statSync(f).size;
    totalSize += size;
  });
  console.log("Fichiers: " + buildFiles.length);
  console.log("Taille totale: " + Math.round(totalSize / 1024) + " KB\n");
}

function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
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

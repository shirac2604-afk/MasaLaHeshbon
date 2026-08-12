import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];
const boardIds = [
  "forest-numbers",
  "lake-addition",
  "math-city",
  "subtraction-trail",
  "treasure-island",
  "grand-math-journey"
];
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const pkg = readJson(path.join(root, "package.json"));

const appInfoText = fs.readFileSync(path.join(root, "src/core/AppInfo.ts"), "utf8");
if (!appInfoText.includes(`version: "${pkg.version}"`)) errors.push("AppInfo version does not match package.json");
if (!appInfoText.includes('name: "מסע לחשבון"')) errors.push("AppInfo name mismatch");

function readPngDimensions(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

if (pkg.name !== "masa-la-heshbon") errors.push("package name must be masa-la-heshbon");
if (pkg.version !== "0.9.1-beta.3") errors.push(`unexpected Beta version: ${pkg.version}`);
if (pkg.build?.productName !== "מסע לחשבון") errors.push("productName mismatch");

const registryText = fs.readFileSync(path.join(root, "src/data/boardPacks/BoardPackRegistry.ts"), "utf8");
const questionRegistryText = fs.readFileSync(path.join(root, "src/data/questionBanks/QuestionBankRegistry.ts"), "utf8");
for (const id of boardIds) {
  if (!registryText.includes(`./${id}.json`)) errors.push(`${id}: missing from BoardPackRegistry`);
  if (!questionRegistryText.includes(`./${id}.json`)) errors.push(`${id}: missing from QuestionBankRegistry`);
}
for (const legacy of ["kamatz-patach", "segol-tzere", "hirik", "holam", "shuruk-kubutz", "masa-hanikud"]) {
  if (registryText.includes(`./${legacy}.json`)) errors.push(`legacy board registered at runtime: ${legacy}`);
  if (questionRegistryText.includes(`./${legacy}.json`)) errors.push(`legacy question bank registered at runtime: ${legacy}`);
}

let totalTiles = 0;
let totalGroups = 0;
let totalQuestions = 0;
let totalTransitions = 0;
const globalQuestionIds = new Set();
for (const id of boardIds) {
  const board = readJson(path.join(root, "src/data/boardPacks", `${id}.json`));
  const bank = readJson(path.join(root, "src/data/questionBanks", `${id}.json`));
  const expected = id === "grand-math-journey" ? 60 : 30;
  if (board.path.length !== expected) errors.push(`${id}: expected ${expected} tiles`);
  const seenPositions = new Set();
  board.path.forEach((tile, index) => {
    totalTiles++;
    if (tile.id !== index + 1) errors.push(`${id}: sequence broken at ${index + 1}`);
    const positionKey = `${tile.center?.x}:${tile.center?.y}`;
    if (seenPositions.has(positionKey)) errors.push(`${id}: duplicate tile center at ${tile.id}`);
    seenPositions.add(positionKey);
    if (tile.id < expected && !bank.groups?.[tile.questionGroup]) errors.push(`${id}: missing group for tile ${tile.id}`);
  });
  const transitions = board.transitions ?? [];
  totalTransitions += transitions.length;
  for (const t of transitions) {
    if (t.from < 1 || t.from > expected || t.to < 1 || t.to > expected || t.from === t.to) errors.push(`${id}: invalid transition ${t.from}->${t.to}`);
    if (t.kind === "ladder" && t.to <= t.from) errors.push(`${id}: ladder must go upward ${t.from}->${t.to}`);
    if (t.kind === "snake" && t.to >= t.from) errors.push(`${id}: snake must go downward ${t.from}->${t.to}`);
  }
  if (id !== "grand-math-journey" && transitions.length !== 0) errors.push(`${id}: learning board cannot contain transitions`);
  if (id === "grand-math-journey") {
    if (transitions.filter(t => t.kind === "ladder").length !== 4) errors.push(`${id}: requires 4 ladders`);
    if (transitions.filter(t => t.kind === "snake").length !== 4) errors.push(`${id}: requires 4 snakes`);
  }
  for (const [groupId, questions] of Object.entries(bank.groups ?? {})) {
    totalGroups++;
    if (questions.length < 3) errors.push(`${id}: ${groupId} has fewer than 3 questions`);
    for (const q of questions) {
      totalQuestions++;
      const globalId = `${q.boardId}:${q.id}`;
      if (globalQuestionIds.has(globalId)) errors.push(`${id}: duplicate question id ${q.id}`);
      globalQuestionIds.add(globalId);
      const answerIds = new Set(q.answers?.map(a => a.id) ?? []);
      if (answerIds.size !== (q.answers?.length ?? 0)) errors.push(`${id}: duplicate answer id in question ${q.id}`);
      if (!answerIds.has(q.correctAnswer)) errors.push(`${id}: invalid correct answer in question ${q.id}`);
    }
  }
  for (const relative of [`public/assets/math/boards/${id}.png`, `public/assets/math/previews/${id}.png`]) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) errors.push(`missing asset: ${relative}`);
    else {
      if (fs.statSync(file).size < 1024) errors.push(`asset is suspiciously small: ${relative}`);
      const dimensions = readPngDimensions(file);
      if (!dimensions) errors.push(`asset is not a valid PNG: ${relative}`);
      else if (relative.includes("/previews/") && (dimensions.width < 640 || dimensions.height < 360)) errors.push(`preview resolution too small: ${relative} (${dimensions.width}x${dimensions.height})`);
      else if (relative.includes("/boards/") && (dimensions.width < 640 || dimensions.height < 360)) errors.push(`board resolution too small: ${relative} (${dimensions.width}x${dimensions.height})`);
    }
  }
}

const assetKeys = fs.readFileSync(path.join(root, "src/core/AssetKeys.ts"), "utf8");
for (const key of ["FOREST_NUMBERS", "LAKE_ADDITION", "MATH_CITY", "SUBTRACTION_TRAIL", "TREASURE_ISLAND", "GRAND_MATH_JOURNEY"]) {
  if (!assetKeys.includes(`${key}:`)) errors.push(`AssetKeys missing ${key}`);
}
if (/KAMATZ|SEGOL|HIRIK|HOLAM|SHURUK|MASA_HANIKUD/.test(assetKeys)) errors.push("AssetKeys still exposes legacy nikud board keys");

const pathLayer = fs.readFileSync(path.join(root, "src/objects/BoardPathLayer.ts"), "utf8");
if (!pathLayer.includes('this.pack.id === "grand-math-journey"')) errors.push("BoardPathLayer does not recognize the final math board");
const movement = fs.readFileSync(path.join(root, "src/managers/MovementManager.ts"), "utf8");
if (movement.includes("data/boardLayouts/BoardLayouts")) errors.push("MovementManager still depends on legacy board layouts");

if (errors.length) {
  console.error(`Beta validation failed with ${errors.length} issue(s):`);
  errors.forEach((error, index) => console.error(`${index + 1}. ${error}`));
  process.exit(1);
}
console.log(`Beta 3 validation passed: ${boardIds.length} boards, ${totalTiles} tiles, ${totalGroups} groups, ${totalQuestions} questions, ${totalTransitions} transitions.`);

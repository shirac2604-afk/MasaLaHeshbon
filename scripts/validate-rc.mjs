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
const readText = file => fs.readFileSync(file, "utf8");
const pkg = readJson(path.join(root, "package.json"));

if (pkg.name !== "masa-la-heshbon") errors.push("package name must be masa-la-heshbon");
if (pkg.version !== "0.9.5-rc.1") errors.push(`unexpected RC version: ${pkg.version}`);
if (pkg.build?.productName !== "מסע לחשבון") errors.push("productName mismatch");
if (pkg.build?.appId !== "il.co.maftehot.masa-la-heshbon") errors.push("appId mismatch");

const appInfo = readText(path.join(root, "src/core/AppInfo.ts"));
if (!appInfo.includes(`version: "${pkg.version}"`)) errors.push("AppInfo version mismatch");
if (!appInfo.includes('name: "מסע לחשבון"')) errors.push("AppInfo name mismatch");

const registry = readText(path.join(root, "src/data/boardPacks/BoardPackRegistry.ts"));
const questionRegistry = readText(path.join(root, "src/data/questionBanks/QuestionBankRegistry.ts"));
for (const id of boardIds) {
  if (!registry.includes(`./${id}.json`)) errors.push(`${id}: missing from BoardPackRegistry`);
  if (!questionRegistry.includes(`./${id}.json`)) errors.push(`${id}: missing from QuestionBankRegistry`);
}

const activeLegacyIds = ["kamatz-patach", "segol-tzere", "hirik", "holam", "shuruk-kubutz", "masa-hanikud"];
for (const id of activeLegacyIds) {
  if (registry.includes(`./${id}.json`) || questionRegistry.includes(`./${id}.json`)) {
    errors.push(`legacy content is still registered at runtime: ${id}`);
  }
}

function parseExercise(symbol) {
  const match = String(symbol ?? "").replace(/\s/g, "").match(/^(\d+)([+\-−])(\d+)$/);
  if (!match) return null;
  const left = Number(match[1]);
  const right = Number(match[3]);
  const result = match[2] === "+" ? left + right : left - right;
  return { left, right, result };
}

let totalTiles = 0;
let totalGroups = 0;
let totalQuestions = 0;
let totalTransitions = 0;
const globalIds = new Set();

for (const boardId of boardIds) {
  const board = readJson(path.join(root, "src/data/boardPacks", `${boardId}.json`));
  const bank = readJson(path.join(root, "src/data/questionBanks", `${boardId}.json`));
  const expectedTiles = boardId === "grand-math-journey" ? 60 : 30;
  if (board.id !== boardId || bank.boardId !== boardId) errors.push(`${boardId}: identity mismatch`);
  if (board.path?.length !== expectedTiles) errors.push(`${boardId}: expected ${expectedTiles} tiles`);

  const centers = new Set();
  for (let index = 0; index < (board.path ?? []).length; index++) {
    const tile = board.path[index];
    totalTiles++;
    if (tile.id !== index + 1) errors.push(`${boardId}: sequence broken at tile ${index + 1}`);
    if (!Number.isFinite(tile.center?.x) || !Number.isFinite(tile.center?.y)) errors.push(`${boardId}: invalid center at tile ${tile.id}`);
    if (!Number.isFinite(tile.anchor?.x) || !Number.isFinite(tile.anchor?.y)) errors.push(`${boardId}: invalid anchor at tile ${tile.id}`);
    const centerKey = `${tile.center?.x}:${tile.center?.y}`;
    if (centers.has(centerKey)) errors.push(`${boardId}: duplicate center at tile ${tile.id}`);
    centers.add(centerKey);
    if (tile.id < expectedTiles && !bank.groups?.[tile.questionGroup]) errors.push(`${boardId}: missing question group for tile ${tile.id}`);
  }

  const transitions = board.transitions ?? [];
  totalTransitions += transitions.length;
  if (boardId === "grand-math-journey") {
    if (transitions.filter(t => t.kind === "ladder").length !== 4) errors.push(`${boardId}: must contain 4 ladders`);
    if (transitions.filter(t => t.kind === "snake").length !== 4) errors.push(`${boardId}: must contain 4 snakes`);
  } else if (transitions.length !== 0) {
    errors.push(`${boardId}: learning boards must not contain transitions`);
  }

  for (const transition of transitions) {
    if (transition.from < 1 || transition.from > expectedTiles || transition.to < 1 || transition.to > expectedTiles || transition.from === transition.to) {
      errors.push(`${boardId}: invalid transition ${transition.from}->${transition.to}`);
    }
    if (transition.kind === "ladder" && transition.to <= transition.from) errors.push(`${boardId}: ladder goes in wrong direction`);
    if (transition.kind === "snake" && transition.to >= transition.from) errors.push(`${boardId}: snake goes in wrong direction`);
  }

  for (const [groupId, questions] of Object.entries(bank.groups ?? {})) {
    totalGroups++;
    if (!Array.isArray(questions) || questions.length < 3) errors.push(`${boardId}: ${groupId} needs at least 3 questions`);
    for (const question of questions) {
      totalQuestions++;
      const uniqueId = `${question.boardId}:${question.id}`;
      if (globalIds.has(uniqueId)) errors.push(`${boardId}: duplicate question id ${question.id}`);
      globalIds.add(uniqueId);
      if (question.boardId !== boardId) errors.push(`${boardId}: question ${question.id} has wrong boardId`);
      if (question.groupId !== groupId) errors.push(`${boardId}: question ${question.id} has wrong groupId`);
      const answers = question.answers ?? [];
      if (answers.length < 2) errors.push(`${boardId}: question ${question.id} has too few answers`);
      const answerIds = new Set(answers.map(answer => answer.id));
      if (answerIds.size !== answers.length) errors.push(`${boardId}: duplicate answer id in question ${question.id}`);
      const correct = answers.find(answer => answer.id === question.correctAnswer);
      if (!correct) errors.push(`${boardId}: invalid correct answer in question ${question.id}`);
      const exercise = parseExercise(question.symbol);
      if (exercise && correct && Number(correct.text) !== exercise.result) {
        errors.push(`${boardId}: arithmetic mismatch in question ${question.id} (${question.symbol} should equal ${exercise.result})`);
      }
      if (exercise && (exercise.result < 0 || exercise.result > 10)) {
        errors.push(`${boardId}: out-of-scope exercise in question ${question.id}: ${question.symbol}`);
      }
    }
  }

  for (const relative of [
    `public/assets/math/boards/${boardId}.png`,
    `public/assets/math/previews/${boardId}.png`
  ]) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) errors.push(`missing asset: ${relative}`);
    else if (fs.statSync(file).size < 1024) errors.push(`asset is suspiciously small: ${relative}`);
  }
}

const bootScene = readText(path.join(root, "src/scenes/BootScene.ts"));
const selectScene = readText(path.join(root, "src/scenes/BoardSelectScene.ts"));
if (!bootScene.includes("ASSET PREFLIGHT")) errors.push("BootScene asset preflight is missing");
if (!selectScene.includes("startSelectedBoard")) errors.push("Board selection start flow is missing");
if (!selectScene.includes("SceneKeys.PLAYER_SETUP")) errors.push("Board selection does not protect empty player setup");

if (errors.length > 0) {
  console.error(`RC validation failed with ${errors.length} issue(s):`);
  errors.forEach((error, index) => console.error(`${index + 1}. ${error}`));
  process.exit(1);
}

console.log(`RC1 validation passed: ${boardIds.length} boards, ${totalTiles} tiles, ${totalGroups} groups, ${totalQuestions} questions, ${totalTransitions} transitions.`);

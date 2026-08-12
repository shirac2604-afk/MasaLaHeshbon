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
const versionPattern = /^\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?$/;
if (!versionPattern.test(pkg.version)) errors.push(`invalid semantic version: ${pkg.version}`);
if (pkg.build?.productName !== "מסע לחשבון") errors.push("productName mismatch");
if (pkg.build?.appId !== "il.co.maftehot.masa-la-heshbon") errors.push("appId mismatch");

const appInfo = readText(path.join(root, "src/core/AppInfo.ts"));
if (!appInfo.includes('name: "מסע לחשבון"')) errors.push("AppInfo name mismatch");
if (!appInfo.includes(`version: "${pkg.version}"`)) errors.push(`AppInfo version mismatch (expected ${pkg.version})`);
if (!appInfo.includes('brand: "מפתחות להצלחה"')) errors.push("brand mismatch");

const registry = readText(path.join(root, "src/data/boardPacks/BoardPackRegistry.ts"));
const questionRegistry = readText(path.join(root, "src/data/questionBanks/QuestionBankRegistry.ts"));
let totalTiles = 0;
let totalGroups = 0;
let totalQuestions = 0;
let totalTransitions = 0;

function parseExercise(symbol) {
  const match = String(symbol ?? "").replace(/\s/g, "").match(/^(\d+)([+\-−])(\d+)$/);
  if (!match) return null;
  const left = Number(match[1]);
  const right = Number(match[3]);
  return { result: match[2] === "+" ? left + right : left - right };
}

for (const boardId of boardIds) {
  if (!registry.includes(`./${boardId}.json`)) errors.push(`${boardId}: missing from BoardPackRegistry`);
  if (!questionRegistry.includes(`./${boardId}.json`)) errors.push(`${boardId}: missing from QuestionBankRegistry`);

  const boardFile = path.join(root, "src/data/boardPacks", `${boardId}.json`);
  const bankFile = path.join(root, "src/data/questionBanks", `${boardId}.json`);
  if (!fs.existsSync(boardFile)) { errors.push(`${boardId}: board file missing`); continue; }
  if (!fs.existsSync(bankFile)) { errors.push(`${boardId}: question bank missing`); continue; }
  const board = readJson(boardFile);
  const bank = readJson(bankFile);
  const expectedTiles = boardId === "grand-math-journey" ? 60 : 30;
  if (board.id !== boardId || bank.boardId !== boardId) errors.push(`${boardId}: identity mismatch`);
  if ((board.path?.length ?? 0) !== expectedTiles) errors.push(`${boardId}: expected ${expectedTiles} tiles`);
  if (board.path?.at(-1)?.type !== "finish") errors.push(`${boardId}: final tile must be finish`);

  const centers = new Set();
  for (let i = 0; i < (board.path ?? []).length; i++) {
    const tile = board.path[i];
    totalTiles++;
    if (tile.id !== i + 1) errors.push(`${boardId}: broken sequence at ${i + 1}`);
    if (!Number.isFinite(tile.center?.x) || !Number.isFinite(tile.center?.y)) errors.push(`${boardId}: invalid center at ${tile.id}`);
    if (!Number.isFinite(tile.anchor?.x) || !Number.isFinite(tile.anchor?.y)) errors.push(`${boardId}: invalid anchor at ${tile.id}`);
    const key = `${tile.center?.x}:${tile.center?.y}`;
    if (centers.has(key)) errors.push(`${boardId}: duplicate center at ${tile.id}`);
    centers.add(key);
    if (tile.id < expectedTiles && !bank.groups?.[tile.questionGroup]) errors.push(`${boardId}: missing group at tile ${tile.id}`);
  }

  const transitions = board.transitions ?? [];
  totalTransitions += transitions.length;
  if (boardId === "grand-math-journey") {
    
    if (transitions.filter(t => t.kind === "ladder").length !== 4) errors.push(`${boardId}: must have 4 ladders`);
    if (transitions.filter(t => t.kind === "snake").length !== 4) errors.push(`${boardId}: must have 4 snakes`);
  } else {
    if (board.layout?.renderTransitions !== false) errors.push(`${boardId}: renderTransitions must be false`);
    if (transitions.length !== 0) errors.push(`${boardId}: learning board must not have transitions`);
  }

  for (const t of transitions) {
    if (t.from < 1 || t.from > expectedTiles || t.to < 1 || t.to > expectedTiles || t.from === t.to) errors.push(`${boardId}: invalid transition ${t.from}->${t.to}`);
    if (t.kind === "ladder" && t.to <= t.from) errors.push(`${boardId}: ladder direction invalid`);
    if (t.kind === "snake" && t.to >= t.from) errors.push(`${boardId}: snake direction invalid`);
  }

  for (const [groupId, questions] of Object.entries(bank.groups ?? {})) {
    totalGroups++;
    if (!Array.isArray(questions) || questions.length < 3) errors.push(`${boardId}: ${groupId} needs at least 3 questions`);
    for (const question of questions ?? []) {
      totalQuestions++;
      if (question.boardId !== boardId) errors.push(`${boardId}: ${question.id} wrong boardId`);
      if (question.groupId !== groupId) errors.push(`${boardId}: ${question.id} wrong groupId`);
      const answers = question.answers ?? [];
      const correct = answers.find(a => a.id === question.correctAnswer);
      if (!correct) errors.push(`${boardId}: ${question.id} missing correct answer`);
      const exercise = parseExercise(question.symbol);
      if (exercise && correct && Number(correct.text) !== exercise.result) errors.push(`${boardId}: ${question.id} arithmetic mismatch`);
      if (exercise && (exercise.result < 0 || exercise.result > 10)) errors.push(`${boardId}: ${question.id} out of range`);
    }
  }

  for (const rel of [
    `public/assets/math/boards/${boardId}.png`,
    `public/assets/math/previews/${boardId}.png`
  ]) {
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) errors.push(`missing asset: ${rel}`);
    else if (fs.statSync(f).size < 1024) errors.push(`asset too small: ${rel}`);
  }
}

if (errors.length) {
  console.error(`Release validation failed with ${errors.length} issue(s):`);
  errors.forEach((e, i) => console.error(`${i + 1}. ${e}`));
  process.exit(1);
}
console.log(`Release validation passed: ${boardIds.length} boards, ${totalTiles} tiles, ${totalGroups} groups, ${totalQuestions} questions, ${totalTransitions} transitions, version ${pkg.version}.`);

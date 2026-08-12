import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const issues = [];
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read("package.json"));

if (pkg.version !== "1.2.2") {
  issues.push(`expected final version 1.2.2, found ${pkg.version}`);
}

const appInfo = read("src/core/AppInfo.ts");
if (!appInfo.includes(`version: "${pkg.version}"`)) issues.push("AppInfo is not synchronized with package.json");

const menu = read("src/scenes/MenuScene.ts");
if (menu.includes('label: "בחירת לוח"')) issues.push("main menu still exposes a direct board-selection action");
if (!menu.includes("SceneKeys.PLAYER_SETUP")) issues.push("new-game flow does not start at player setup");

const gameplay = read("src/managers/GameplayCoordinator.ts");
const landedIndex = gameplay.indexOf("handleMovementFinished");
const questionIndex = gameplay.indexOf("this.openQuestion", landedIndex);
if (landedIndex < 0 || questionIndex < landedIndex) issues.push("question flow is not triggered after movement landing");

const sounds = read("src/services/SoundManager.ts");
for (const method of ["playDice", "playCorrect", "playWrong", "playWin"]) {
  if (!sounds.includes(`public ${method}`)) issues.push(`missing sound effect: ${method}`);
}

const settings = read("src/scenes/SettingsScene.ts");
if (!settings.includes("soundManager.setEnabled")) issues.push("sound mute control is not connected");
if (!settings.includes("preferencesService.setReducedMotion")) issues.push("reduced-motion control is not connected");

const winPopup = read("src/ui/WinPopup.ts");
for (const label of ["שאלות", "נכונות", "לתפריט"]) {
  if (!winPopup.includes(label)) issues.push(`winner summary is missing expected text: ${label}`);
}

const required = [
  "README_HE.md",
  "RELEASE_NOTES_1.2.0_GOLD_HE.md",
  "FINAL_PLAYTEST_CHECKLIST_HE.md",
  "build/icon.ico",
  "electron/main.cjs"
];
for (const rel of required) if (!exists(rel)) issues.push(`missing release file: ${rel}`);

if (issues.length) {
  console.error(`Final validation failed with ${issues.length} issue(s):`);
  issues.forEach((issue, index) => console.error(`${index + 1}. ${issue}`));
  process.exit(1);
}

console.log(`Final validation passed for ${pkg.name}@${pkg.version}.`);

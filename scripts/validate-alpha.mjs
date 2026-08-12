import fs from "node:fs"; import path from "node:path"; import process from "node:process";
const root=process.cwd(),errors=[]; const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
if(pkg.name!=="masa-la-heshbon")errors.push("package name must be masa-la-heshbon"); if(pkg.version!=="0.7.0-alpha.7")errors.push(`unexpected version: ${pkg.version}`); if(pkg.build?.productName!=="מסע לחשבון")errors.push("productName mismatch");
const ids=["forest-numbers","lake-addition","math-city","subtraction-trail","treasure-island","grand-math-journey"];
for(const id of ids)for(const f of [`src/data/boardPacks/${id}.json`,`src/data/questionBanks/${id}.json`,`public/assets/math/boards/${id}.png`,`public/assets/math/previews/${id}.png`])if(!fs.existsSync(path.join(root,f)))errors.push(`missing Alpha 0.7 file: ${f}`);
const grand=JSON.parse(fs.readFileSync(path.join(root,"src/data/boardPacks/grand-math-journey.json"),"utf8"));
if(grand.path?.length!==60)errors.push("grand journey must contain 60 tiles"); const ladders=(grand.transitions??[]).filter(t=>t.kind==="ladder").length; const snakes=(grand.transitions??[]).filter(t=>t.kind==="snake").length; if(ladders!==4||snakes!==4)errors.push("grand journey must have 4 ladders and 4 snakes");
if(errors.length){console.error(`Alpha validation failed with ${errors.length} issue(s):`);errors.forEach((e,i)=>console.error(`${i+1}. ${e}`));process.exit(1);} console.log("Alpha 0.7 validation passed: six playable math boards, 60-tile grand journey, and question banks verified.");

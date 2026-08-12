import fs from "node:fs";
import path from "node:path";
import process from "node:process";
const root=process.cwd();
const ids=["forest-numbers","lake-addition","math-city","subtraction-trail","treasure-island","grand-math-journey"];
const errors=[]; const read=file=>{try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch(e){errors.push(`${file}: ${e.message}`);}};
let tiles=0,groups=0,questions=0,transitions=0;
for(const id of ids){
 const board=read(path.join(root,"src/data/boardPacks",`${id}.json`)); const bank=read(path.join(root,"src/data/questionBanks",`${id}.json`)); if(!board||!bank)continue;
 const expected=id==="grand-math-journey"?60:30;
 if(board.schemaVersion!==2)errors.push(`${id}: schemaVersion must be 2`); if(board.id!==id||bank.boardId!==id)errors.push(`${id}: id mismatch`);
 if(!Array.isArray(board.path)||board.path.length!==expected)errors.push(`${id}: must contain exactly ${expected} tiles`);
 const tr=Array.isArray(board.transitions)?board.transitions:[]; transitions+=tr.length;
 if(id==="grand-math-journey"){const ladders=tr.filter(t=>t.kind==="ladder").length,snakes=tr.filter(t=>t.kind==="snake").length;if(ladders!==4||snakes!==4)errors.push(`${id}: requires 4 ladders and 4 snakes`);} else if(tr.length!==0) errors.push(`${id}: learning board must have no transitions`);
 for(let i=0;i<(board.path??[]).length;i++){const tile=board.path[i];tiles++;if(tile.id!==i+1)errors.push(`${id}: tile sequence broken at ${i+1}`);for(const k of ["center","anchor"]){const p=tile[k];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)errors.push(`${id}: invalid ${k} on tile ${tile.id}`);}if(tile.id<expected){const g=bank.groups?.[tile.questionGroup];if(!tile.label)errors.push(`${id}: missing label on tile ${tile.id}`);if(!Array.isArray(g)||g.length<3)errors.push(`${id}: tile ${tile.id} needs 3 questions`);else if(g.some(q=>q.symbol!==tile.label))errors.push(`${id}: symbol mismatch on tile ${tile.id}`);}}
 for(const [gid,qs] of Object.entries(bank.groups??{})){groups++;for(const q of qs){questions++;if(q.groupId!==gid||q.boardId!==id)errors.push(`${id}: question ${q.id} metadata mismatch`);if(!q.answers?.some(a=>a.id===q.correctAnswer))errors.push(`${id}: question ${q.id} invalid correct answer`);}}
 for(const asset of [`public/assets/math/boards/${id}.png`,`public/assets/math/previews/${id}.png`])if(!fs.existsSync(path.join(root,asset)))errors.push(`missing asset: ${asset}`);
}
if(errors.length){console.error(`Content validation failed with ${errors.length} issue(s):`);errors.forEach((e,i)=>console.error(`${i+1}. ${e}`));process.exit(1);}
console.log(`Math content validation passed: ${ids.length} boards, ${tiles} tiles, ${groups} groups, ${questions} questions, ${transitions} transitions.`);

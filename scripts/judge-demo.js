import { mkdirSync, writeFileSync } from 'node:fs';
import { judgeWorkflow } from './lib/judge-workflow.js';
const {html,...report}=await judgeWorkflow();
mkdirSync('.local',{recursive:true});
writeFileSync('.local/judge-evidence.json',JSON.stringify(report,null,2));
writeFileSync('.local/judge-marksheet.html',html);
if(process.argv.includes('--export-fixtures')) writeFileSync('fixtures/proof-vectors.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
console.log('Disposable schema removed; development publications and keys untouched. Evidence: .local/judge-evidence.json');

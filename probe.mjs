import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
console.log(execSync('node collector/collect.js https://watabo-bonobo.github.io/SportsDashboard/data/events.json public/data/events.json /tmp/out.json 2>&1').toString().split('\n').filter(l => /得点者|件を書き出し|✗/.test(l)).join('\n'));
const d = JSON.parse(readFileSync('/tmp/out.json', 'utf8'));
for (const e of d.events.filter(e => e.goals)) console.log('G', JSON.stringify({ id: e.id, start: e.start, home: e.home, away: e.away, result: e.result, goals: e.goals }));

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/utils/time.ts'), 'utf8');
const context = { exports: {}, Date };
vm.runInNewContext(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  context,
);
const { nextEndTime, formatClock, formatEndTime } = context.exports;
const today = new Date(2026, 8, 12, 7, 30).getTime();
assert.equal(nextEndTime(today, 8, 0), new Date(2026, 8, 12, 8).getTime());
assert.equal(nextEndTime(today, 7, 0), new Date(2026, 8, 13, 7).getTime());
assert.equal(nextEndTime(new Date(2026, 8, 12, 8).getTime(), 8, 0), new Date(2026, 8, 13, 8).getTime());
assert.equal(nextEndTime(new Date(2026, 11, 31, 23, 59).getTime(), 0, 0), new Date(2027, 0, 1).getTime());
assert.equal(formatClock(today), '07:30');
assert.equal(formatEndTime(nextEndTime(today, 8, 0), today), 'Today, 08:00');
assert.equal(formatEndTime(nextEndTime(today, 7, 0), today), 'Tomorrow, 07:00');
// Calendar arithmetic must honor local daylight-saving boundaries.
for (const [month, day] of [
  [2, 28],
  [9, 24],
]) {
  const before = new Date(2026, month, day, 12).getTime();
  assert.equal(nextEndTime(before, 8, 0), new Date(2026, month, day + 1, 8).getTime());
}
console.log('Time planning checks passed: same day, rollover, exact time, year boundary, display, DST.');

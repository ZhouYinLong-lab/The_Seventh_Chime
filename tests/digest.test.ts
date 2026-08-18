import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { b7AlignmentDigests, b7Events, B7_SALT } from '../src/b7-timeline.ts';
import { sha256Hex } from '../src/digest.ts';
import { EXAM_SALT, examDigests, examQuestions } from '../src/final-exam.ts';

const baseline = JSON.parse(readFileSync(new URL('../author/baseline.json', import.meta.url), 'utf8')) as { b7Timeline: [string, string][]; finalAnswers: [string, string][] };

test('SHA-256 标准测试向量', () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('终局答卷摘要与作者基线一致', () => {
  assert.deepEqual(Object.keys(examDigests).sort(), examQuestions.map((question) => question.id).sort());
  for (const [answer, id] of baseline.finalAnswers) assert.equal(examDigests[id], sha256Hex(EXAM_SALT + id + ':' + answer), `${id} 的摘要与基线答案不符`);
});

test('B7 对齐摘要与作者基线一致', () => {
  assert.deepEqual(Object.keys(b7AlignmentDigests).sort(), b7Events.map((event) => event.id).sort());
  for (const [time, id] of baseline.b7Timeline) assert.equal(b7AlignmentDigests[id], sha256Hex(B7_SALT + id + ':' + time), `${id} 的摘要与基线时刻不符`);
});

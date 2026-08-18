import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { content } from '../src/content.ts';
import { EXAM_CATEGORIES, examEvidenceEligible, makeExamEvidenceDraft, validateExamEvidence } from '../src/exam-evidence.ts';

const baseline = JSON.parse(readFileSync(new URL('../author/baseline.json', import.meta.url), 'utf8')) as { examEvidence: Record<string, string[]> };
const discovered = ['doc_b4_j_livia', 'doc_b5_j_livia', 'doc_b6_j_livia', 'doc_b5_r_mara_klara', 'doc_b7_r_klara_kovac_verri', 'doc_b6_h_mateo_kovac_verri'];

test('证据白名单与作者基线一致', () => {
  assert.deepEqual(EXAM_CATEGORIES, ['body_location', 'soul_identity', 'causal_continuity']);
  assert.deepEqual(examEvidenceEligible, baseline.examEvidence);
  const all = new Set(Object.values(examEvidenceEligible).flat());
  for (const docId of all) {
    assert.ok(content.documents.some((doc) => doc.id === docId), `${docId} 不在玩家档案中`);
    const found = content.documents.find((doc) => doc.id === docId);
    assert.ok(found && ['b4', 'b5', 'b6', 'b7'].includes(found.bell), `${docId} 不在 B4–B7 链上`);
  }
});

test('三类证据齐备且跨至少两份档案才通过', () => {
  const refs = {
    body_location: { docId: 'doc_b4_j_livia', segmentId: 's1' },
    soul_identity: { docId: 'doc_b6_j_livia', segmentId: 's1' },
    causal_continuity: { docId: 'doc_b5_r_mara_klara', segmentId: 's1' }
  };
  assert.equal(validateExamEvidence(refs, discovered), true);
  const missing = { ...refs, causal_continuity: null };
  assert.equal(validateExamEvidence(missing, discovered), false, '缺一类证据不通过');
  const offList = { ...refs, body_location: { docId: 'doc_b0_r_klara', segmentId: 's1' } };
  assert.equal(validateExamEvidence(offList, discovered), false, '白名单外档案不通过');
  const notDiscovered = { ...refs, soul_identity: { docId: 'doc_b6_r_mara_klara', segmentId: 's1' } };
  assert.equal(validateExamEvidence(notDiscovered, discovered), false, '未发现档案不通过');
  const sameDoc = {
    body_location: { docId: 'doc_b4_j_livia', segmentId: 's1' },
    soul_identity: { docId: 'doc_b4_j_livia', segmentId: 's2' },
    causal_continuity: { docId: 'doc_b4_j_livia', segmentId: 's3' }
  };
  assert.equal(validateExamEvidence(sameDoc, discovered), false, '三份证据同档案不通过');
});

test('证据草稿工厂每次返回独立对象', () => {
  const first = makeExamEvidenceDraft();
  first.body_location = { docId: 'doc_b4_j_livia', segmentId: 's1' };
  const second = makeExamEvidenceDraft();
  assert.deepEqual(second, { body_location: null, soul_identity: null, causal_continuity: null });
  assert.notEqual(first, second);
});

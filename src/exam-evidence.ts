import type { EvidenceReference, ExamCategory } from './types';

// 终局答卷证据门槛（规范 §4.8 G8）：三类证据各选一段已发现档案中的段落，
// 落入对应类别白名单，且三类证据跨至少两份不同档案。
export const EXAM_CATEGORIES: ExamCategory[] = ['body_location', 'soul_identity', 'causal_continuity'];
export const EXAM_CATEGORY_LABELS: Record<ExamCategory, string> = { body_location: '身体／地点', soul_identity: '灵魂指认', causal_continuity: '因果连续' };
export const examEvidenceEligible: Record<ExamCategory, string[]> = {
  body_location: ['doc_b4_j_livia', 'doc_b5_h_kovac_verri', 'doc_b7_r_klara_kovac_verri'],
  soul_identity: ['doc_b5_j_livia', 'doc_b6_r_mara_klara', 'doc_b6_j_livia'],
  causal_continuity: ['doc_b4_r_klara', 'doc_b5_r_mara_klara', 'doc_b6_h_mateo_kovac_verri']
};
export const makeExamEvidenceDraft = (): Record<ExamCategory, EvidenceReference | null> => ({ body_location: null, soul_identity: null, causal_continuity: null });
export const validateExamEvidence = (evidence: Record<ExamCategory, EvidenceReference | null>, discovered: string[]): boolean => EXAM_CATEGORIES.every((category) => { const ref = evidence[category]; if (!ref) return false; return examEvidenceEligible[category].includes(ref.docId) && discovered.includes(ref.docId); }) && new Set(EXAM_CATEGORIES.map((category) => evidence[category]!.docId)).size >= 2;

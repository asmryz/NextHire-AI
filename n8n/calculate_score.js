// n8n Code node: "Calculate score"   (Mode: Run Once for Each Item)
// Input: the Gemini node's output. Takes requirements + answers from "Build prompt".
//
// Hybrid evaluation (SRS REQ-29..31, REQ-40):
//   1. Structured answers are checked by fixed rules, so they are always judged the same way:
//        SKILL          level answer (None < Entry level < Medium < Expert) vs the minimum
//        EXPERIENCE     years answer vs the minimum years
//        QUALIFICATION / CERTIFICATION   "Yes" = met, "No" / "Currently studying" = not met
//   2. Anything the rules cannot decide uses Gemini's judgement.
//   3. Score = sum of the weightage of met requirements (0-100).
//   4. Tag: STRONG >= 75 and every mandatory met · POSSIBLE >= 50 · else NOT_A_FIT.
//      A missed mandatory requirement can never be STRONG (at most POSSIBLE).
const STRONG_AT = 75;
const POSSIBLE_AT = 50;

const prev = $('Build prompt').item.json;
const reqs = prev.requirements || [];
const answers = (typeof prev.answers === 'string' ? JSON.parse(prev.answers) : prev.answers) || [];

// ---------- Gemini's answer (whatever shape the node returns)
const out = $input.item.json;
const text =
  out?.content?.parts?.[0]?.text ??
  out?.candidates?.[0]?.content?.parts?.[0]?.text ??
  out?.text ?? out?.output ?? out?.message?.content ??
  (typeof out === 'string' ? out : JSON.stringify(out));

let aiResults = new Map();
try {
  const cleaned = String(text).replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
  aiResults = new Map((parsed.results || []).map((r) => [Number(r.requirement_id), r]));
} catch (e) {
  // Rules below still score the structured answers; requirements they cannot decide count as not met
}

// ---------- Rule helpers
const LEVEL = { none: 0, beginner: 1, 'entry level': 1, entry: 1, basic: 1, intermediate: 2, medium: 2, advanced: 3, expert: 4 };
const levelOf = (v) => {
  const s = String(v || '').toLowerCase().trim();
  if (s in LEVEL) return LEVEL[s];
  const key = Object.keys(LEVEL).find((k) => s.startsWith(k));
  return key === undefined ? null : LEVEL[key];
};
const firstNumber = (v) => {
  const m = String(v ?? '').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const isYesNo = (v) => ['yes', 'no', 'currently studying'].includes(String(v || '').toLowerCase().trim());

// Decide one requirement from its answers. Returns { is_met, matched_value } or null (= ask Gemini).
function ruleCheck(r, list) {
  const type = String(r.type || '').toUpperCase();
  if (type === 'SKILL') {
    const exact = (x) => String(x.answer || '').toLowerCase().trim() in LEVEL;
    const a = list.find((x) => exact(x) && /level/i.test(x.question || '')) || list.find(exact);
    if (!a) return null;
    const have = levelOf(a.answer);
    const need = r.min_value ? levelOf(r.min_value) : 1;
    if (need === null) return null; // unusual minimum: let Gemini judge
    return { is_met: have >= need, matched_value: `Level: ${a.answer}${r.min_value ? ` (min ${r.min_value})` : ''}` };
  }
  if (type === 'EXPERIENCE') {
    const a = list.find((x) => /year/i.test(x.question || '') && firstNumber(x.answer) !== null);
    if (!a) return null;
    const years = firstNumber(a.answer);
    const need = r.min_value ? firstNumber(r.min_value) : 0;
    if (need === null) return null;
    return { is_met: r.min_value ? years >= need : years > 0, matched_value: `${years} years${r.min_value ? ` (min ${r.min_value})` : ''}` };
  }
  if (type === 'QUALIFICATION' || type === 'CERTIFICATION') {
    const a = list.find((x) => isYesNo(x.answer));
    if (!a) return null;
    const detail = list.find((x) => x !== a && x.answer && String(x.answer).trim());
    return {
      is_met: String(a.answer).toLowerCase().trim() === 'yes',
      matched_value: `${a.answer}${detail ? `: ${detail.answer}` : ''}`,
    };
  }
  return null;
}

// ---------- Score every requirement
let total = 0;
let mandatoryMissing = false;

const details = reqs.map((r) => {
  const id = Number(r.requirement_id);
  const list = answers.filter((a) => Number(a.requirement_id) === id);
  const rule = ruleCheck(r, list);
  const ai = aiResults.get(id);
  const isMet = rule ? rule.is_met : ai ? ai.is_met === true || ai.is_met === 'true' : false;
  const evidence = rule ? rule.matched_value : ai?.matched_value || 'Not answered';

  const weight = Number(r.weightage) || 0;
  const awarded = isMet ? weight : 0;
  total += awarded;
  if (r.mandatory && !isMet) mandatoryMissing = true;
  return { requirement_id: id, is_met: isMet, matched_value: String(evidence).slice(0, 100), weight_awarded: awarded };
});

const score = Math.round(total * 100) / 100;
let tag = 'NOT_A_FIT';
if (score >= STRONG_AT && !mandatoryMissing) tag = 'STRONG';
else if (score >= POSSIBLE_AT) tag = 'POSSIBLE';

return {
  json: {
    application_id: prev.application_id,
    vacancy_id: prev.vacancy_id,
    fulfilment_pct: score,
    ai_match_tag: tag,
    mandatory_missing: mandatoryMissing,
    details_json: JSON.stringify(details),
    // Same details as base64 (no commas), so n8n's comma-separated Query Parameters can't break it
    details_b64: typeof Buffer !== 'undefined'
      ? Buffer.from(JSON.stringify(details), 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(JSON.stringify(details)))),
  },
};
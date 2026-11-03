// n8n Code node: "Calculate score"   (Mode: Run Once for Each Item)
// Input: the Gemini node's output. Takes requirements from "Build prompt".
// Applies mandatory flags + weightage (SRS REQ-31), caps the score when a
// mandatory requirement is missed and tags the candidate (REQ-40).
const STRONG_AT = 75;   // >= 75% and all mandatory met  -> STRONG
const POSSIBLE_AT = 50; // >= 50%                        -> POSSIBLE, else NOT_A_FIT
const MANDATORY_CAP = 40; // missing a mandatory requirement caps the score here

const prev = $('Build prompt').item.json;
const reqs = prev.requirements;

// Find the model's text whatever shape the Gemini node returns
const out = $input.item.json;
const text =
  out?.content?.parts?.[0]?.text ??
  out?.candidates?.[0]?.content?.parts?.[0]?.text ??
  out?.text ?? out?.output ?? out?.message?.content ??
  (typeof out === 'string' ? out : JSON.stringify(out));

let parsed;
try {
  const cleaned = String(text).replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  parsed = JSON.parse(cleaned.slice(start, end + 1));
} catch (e) {
  throw new Error(`Gemini did not return valid JSON for application ${prev.application_id}`);
}

const byId = new Map((parsed.results || []).map((r) => [Number(r.requirement_id), r]));
let total = 0;
let mandatoryMissing = false;

const details = reqs.map((r) => {
  const res = byId.get(Number(r.requirement_id)) || { is_met: false, matched_value: 'Not answered' };
  const isMet = res.is_met === true || res.is_met === 'true';
  const weight = Number(r.weightage) || 0;
  const awarded = isMet ? weight : 0;
  total += awarded;
  if (r.mandatory && !isMet) mandatoryMissing = true;
  return {
    requirement_id: Number(r.requirement_id),
    is_met: isMet,
    matched_value: String(res.matched_value || '').slice(0, 100),
    weight_awarded: awarded,
  };
});

let score = Math.round(total * 100) / 100;
if (mandatoryMissing) score = Math.min(score, MANDATORY_CAP);

let tag = 'NOT_A_FIT';
if (!mandatoryMissing && score >= STRONG_AT) tag = 'STRONG';
else if (!mandatoryMissing && score >= POSSIBLE_AT) tag = 'POSSIBLE';

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

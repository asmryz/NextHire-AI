// n8n Code node: "Build prompt"   (Mode: Run Once for Each Item)
// Input: one row from "Load application" (application_id, vacancy_id, vacancy_title, requirements, answers)
const row = $input.item.json;
const reqs = typeof row.requirements === 'string' ? JSON.parse(row.requirements) : row.requirements || [];
const answers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers || [];

const reqText = reqs
  .map((r) => `- requirement_id ${r.requirement_id} | ${r.type} | "${r.name}"` +
    (r.min_value ? ` | minimum: ${r.min_value}` : '') + (r.mandatory ? ' | MANDATORY' : ''))
  .join('\n');

// Only the structured answers are scored (portfolio link and gender are never sent, BR-3)
const ansText = answers
  .map((a) => `- ${a.requirement_id ? `requirement_id ${a.requirement_id}` : 'extra question'} | Q: ${a.question} | A: ${a.answer ?? '(no answer)'}`)
  .join('\n');

const prompt = `You are the screening assistant of a recruitment system. Evaluate ONE job application
strictly against the listed requirements of the vacancy "${row.vacancy_title}".

Rules:
- Judge each requirement only from the candidate's answers. Do not guess or invent facts.
- Treat equivalent skills as the same (e.g. "JS" = "JavaScript", "ML" = "Machine Learning", "Postgres" = "PostgreSQL").
- SKILL: levels from low to high are None < Entry level < Medium < Expert. Met only if the candidate's level >= the minimum.
- EXPERIENCE: compare the number of years with the minimum (Entry level = 0-2 years, Medium = 2-5 years, Expert = 5+ years; use the lower number). Met only if years >= minimum.
- QUALIFICATION / CERTIFICATION: if the candidate answered "Yes" to "Do you have ..." it is met; "No" or "Currently studying" is not met.
  Otherwise met if the stated qualification is the same or clearly higher / equivalent (e.g. BS, BSSE, BSCS, BBA are Bachelor's degrees).
- If no minimum is given, met when the candidate clearly has it.
- Ignore name, gender, city or anything not related to the requirements.

Requirements:
${reqText}

Candidate answers:
${ansText}

Return ONLY JSON, no markdown, in exactly this shape:
{"results":[{"requirement_id":<number>,"is_met":<true|false>,"matched_value":"<short evidence from the answer, max 80 chars>"}]}
Include every requirement_id exactly once.`;

return { json: { ...row, requirements: reqs, prompt } };

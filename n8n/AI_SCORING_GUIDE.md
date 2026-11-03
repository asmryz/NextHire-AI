# NexHire AI — n8n AI Scoring Workflow (SRS 4.5)

Owner: **Aarian** · Rakhne ki jagah: `NextHire-AI/n8n/AI_SCORING_GUIDE.md`

Yeh workflow har submitted application ko vacancy ki requirements se match karta hai
(Gemini se), fulfilment % nikalta hai, score + breakdown database mein save karta hai,
match tag lagata hai aur vacancy ke saare candidates ki ranking update karta hai.
HR Application Inbox yeh score khud dikhane lagega ("Pending evaluation" hat jayega).

```
Candidate submits ──► backend ──► n8n Webhook ─┐
                                               ├─► Load application ─► Build prompt ─► Gemini
Every 10 min (retry) ─► Find pending ──────────┘                                         │
                                                                                          ▼
                      Re-rank vacancy ◄── Save score ◄── Retire old score ◄── Calculate score
```

---

## 0. Ek dafa ki tayyari

1. **Gemini API key:** https://aistudio.google.com/apikey → *Create API key* → copy.
   (Free tier kaafi hai; taqreeban 10 requests/minute. Key kabhi GitHub par nahi.)
2. **n8n credential:** n8n (`http://localhost:5678`) → *Credentials* → *Add* →
   **Google Gemini(PaLM) API** → Host: `https://generativelanguage.googleapis.com`,
   API Key: upar wali → Save. Naam: **Gemini NexHire**.
3. **Postgres credential** pehle se bana hai: **Neon NexHire** (`n8n_user`).
   `n8n_user` ko `ai_score` aur `score_detail` likhne ki ijazat pehle se hai.

---

## 1. Naya workflow: "NexHire - AI Scoring"

Har node ka naam **bilkul yahi** rakhna (Code node isi naam se pichle node ko padhta hai).

### Node 1 — `Webhook`  (trigger A: new application)
- HTTP Method: **POST**
- Path: `application-submitted`
- Respond: **Immediately**
- Is ke baad **Edit Fields (Set)** node `From webhook`:
  `application_id` (Number) = `{{ $json.body.application_id }}`

### Node 2 — `Schedule Trigger`  (trigger B: retry pending, SRS REQ-35)
- Every **10 minutes**
- Is ke baad **Postgres** node `Find pending` → *Execute a SQL query*:
```sql
SELECT a.application_id
  FROM application a
 WHERE a.is_active
   AND NOT EXISTS (SELECT 1 FROM ai_score s
                    WHERE s.application_id = a.application_id
                      AND s.is_current AND s.eval_status = 'EVALUATED')
 ORDER BY a.submitted_at
 LIMIT 5;
```

`From webhook` aur `Find pending` **dono** ko agle node `Load application` se jodo.

### Node 3 — `Load application`  (Postgres → Execute a SQL query)
Query Parameters: `{{ $json.application_id }}`
```sql
SELECT a.application_id, a.vacancy_id, v.title AS vacancy_title,
       (SELECT json_agg(json_build_object(
                 'requirement_id', r.requirement_id, 'type', r.req_type, 'name', r.name,
                 'min_value', r.min_value, 'mandatory', r.is_mandatory, 'weightage', r.weightage)
               ORDER BY r.requirement_id)
          FROM vacancy_requirement r WHERE r.vacancy_id = a.vacancy_id) AS requirements,
       (SELECT json_agg(json_build_object(
                 'requirement_id', f.requirement_id, 'question', f.label, 'answer', ans.answer_value)
               ORDER BY f.display_order, f.field_id)
          FROM form_field f
          LEFT JOIN application_answer ans
                 ON ans.field_id = f.field_id AND ans.application_id = a.application_id
         WHERE f.vacancy_id = a.vacancy_id
           -- personal details are never sent to the AI (fair scoring)
           AND COALESCE(f.field_key, '') NOT IN ('full_name','email','phone','cnic','gender','city','cover_note')) AS answers
  FROM application a
  JOIN vacancy v ON v.vacancy_id = a.vacancy_id
 WHERE a.application_id = $1 AND a.is_active;
```

### Node 4 — `Build prompt`  (Code → JavaScript, Mode: **Run Once for Each Item**)
`build_prompt.js` ka poora code paste karo.

### Node 5 — `Gemini`  (Google Gemini → **Message a model**)
- Credential: **Gemini NexHire**
- Model: list mein se koi **Flash** model (e.g. latest *Gemini Flash*)
- Message (User): `{{ $json.prompt }}`
- Options: **Temperature = 0** (har dafa same faisla), agar "Output as JSON / JSON mode" ka option ho to on
- Node **Settings** → *Retry On Fail* = on, Max Tries 3, Wait 5000 ms
- Settings → *On Error* = **Continue (using error output)** → error output ko kahin
  na jodo. Fail hone par kuch save nahi hota, application "Pending" rehti hai aur
  10 minute baad Schedule dobara try karta hai.

### Node 6 — `Calculate score`  (Code → JavaScript, Mode: **Run Once for Each Item**)
`calculate_score.js` ka poora code paste karo.
Rules: met = poora weightage, missed = 0 · mandatory miss → score max 40% aur
**Not a Fit** · ≥75% (sab mandatory met) → **Strong** · ≥50% → **Possible** · warna **Not a Fit**.

### Node 7 — `Retire old score`  (Postgres → Execute a SQL query)
Query Parameters: `{{ $json.application_id }}`
```sql
UPDATE ai_score SET is_current = false
 WHERE application_id = $1 AND is_current
RETURNING score_id;
```
Node Settings → **Always Output Data = on** (pehli dafa koi purana score nahi hota).

### Node 8 — `Save score`  (Postgres → Execute a SQL query)
Query Parameters (ek line, isi order mein):
```
{{ $('Calculate score').item.json.application_id }}, {{ $('Calculate score').item.json.fulfilment_pct }}, {{ $('Calculate score').item.json.ai_match_tag }}, {{ $('Calculate score').item.json.details_b64 }}
```
```sql
WITH ver AS (
  SELECT COALESCE(MAX(version), 0) + 1 AS v FROM ai_score WHERE application_id = $1
), ins AS (
  INSERT INTO ai_score (application_id, version, is_current, fulfilment_pct, ai_match_tag, eval_status, evaluated_at)
  SELECT $1, v, true, $2, $3::match_tag, 'EVALUATED', now() FROM ver
  RETURNING score_id
)
INSERT INTO score_detail (score_id, requirement_id, is_met, matched_value, weight_awarded)
SELECT ins.score_id, d.requirement_id, d.is_met, d.matched_value, d.weight_awarded
  FROM ins, json_to_recordset(convert_from(decode($4, 'base64'), 'UTF8')::json)
       AS d(requirement_id int, is_met boolean, matched_value text, weight_awarded numeric)
RETURNING score_id;
```
Purane scores delete nahi hote, naya **version** banta hai (BR-17).
> Agar n8n details_json mein comma ki wajah se parameters galat tod de, to Node 8 ki
> Options mein *Query Parameters* ko array expression bana do:
> `{{ [$('Calculate score').item.json.application_id, $('Calculate score').item.json.fulfilment_pct, $('Calculate score').item.json.ai_match_tag, $('Calculate score').item.json.details_json] }}`

### Node 9 — `Re-rank vacancy`  (Postgres → Execute a SQL query)
Query Parameters: `{{ $('Calculate score').item.json.vacancy_id }}`
```sql
UPDATE ai_score s SET rank_no = r.rn
  FROM (SELECT s2.score_id, RANK() OVER (ORDER BY s2.fulfilment_pct DESC) AS rn
          FROM ai_score s2
          JOIN application a ON a.application_id = s2.application_id
         WHERE a.vacancy_id = $1 AND a.is_active
           AND s2.is_current AND s2.eval_status = 'EVALUATED') r
 WHERE s.score_id = r.score_id
RETURNING s.application_id, s.fulfilment_pct, s.rank_no;
```

---

## 2. Test (pehle manually)

1. Candidate se ek application submit karo (ya pehle se pending wali use karo).
2. Workflow mein `Schedule Trigger` ke paas **Execute workflow** dabao.
   Har node par hara ✓ aur output dekho: `Calculate score` mein %, tag aur details.
3. HR → **Application Inbox** → score aur tag nazar aaye → application kholo →
   "AI evaluation" mein ✓/✗ breakdown.

## 3. Backend se jodna (har nayi application par foran scoring)

1. Workflow upar right **Active** on karo (**sirf ek laptop par**, warna do score banenge).
2. `backend/.env` mein (sirf us laptop par jahan n8n Active hai):
   ```
   N8N_APPLICATION_WEBHOOK_URL=http://localhost:5678/webhook/application-submitted
   ```
   (Test mode mein URL `.../webhook-test/...` hota hai; Active ke baad `/webhook/`.)
3. Backend restart. Ab har submit par Shivani ka `application.controller.js` khud n8n ko bata deta hai.
   n8n band ho to bhi application save hoti hai; Schedule baad mein score kar deta hai.

## 4. Share karna
Workflow → `...` → **Download** → `NextHire-AI/n8n/workflows/ai-scoring.json` → push.
Partner: **Import from File**, phir apne credentials (Neon NexHire, Gemini NexHire) chune.
Credentials JSON ke saath export nahi hote.

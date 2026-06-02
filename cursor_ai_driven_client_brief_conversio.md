# AI-driven client brief conversion requirements
_Exported on 5/13/2026 at 16:13:58 GMT+5 from Cursor (3.3.30)_

---

**User**

this is a project high level overview. read it carefully and refine the requirements first and understand what we have to build. 

AI-Powered Client Brief → Dev-Ready Tasks / Jira Tickets Converter

Objective
Build an AI-driven system that transforms raw, unstructured client briefs into:

Clear, structured, developer-ready task breakdowns
Automatically generated developer tickets


The goal is to  build a tool for PMO department which will eliminate ambiguity, reduce back-and-forth communication, and enable developers to start implementation immediately. The system must never make assumptions. Instead.

Points to consider : 


No authentication is required

---

**Cursor**

Refining the requirements from your overview and checking the repo for alignment.



Here is a tightened reading of what you described, what it implies, and what still needs a product decision. Your repo is currently a NestJS backend + frontend scaffold with no domain logic for briefs or tickets yet, so this is effectively the product spec you are building toward.

## Refined goal

**Primary users:** PMO (and indirectly developers).

**Primary outcome:** Turn an unstructured client brief into two concrete artifacts:

1. **A structured work breakdown** — hierarchical, unambiguous, implementation-oriented (epics → stories → tasks or whatever hierarchy you standardize on).
2. **Exportable developer tickets** — field-complete enough that a dev can start *or* explicitly blocked by listed gaps (not by silent guessing).

**Constraint you emphasized:** The system must **not invent scope**. That is the real meaning of “never make assumptions” in this context: no silent filling of missing acceptance criteria, tech choices, timelines, integrations, or success metrics.

## Operational definition of “no assumptions”

Because any NLP step involves *some* interpretation (e.g. resolving “they” to a named entity), you should refine the rule into **allowed** vs **forbidden** behavior:

| Allowed | Forbidden (unless explicitly marked and separated) |
|--------|-----------------------------------------------------|
| Reorganize and rephrase **only** what the brief states | Invent features, APIs, SLAs, or environments not mentioned |
| Extract explicit lists, dates, names, constraints from text | Implied “industry standard” behavior as fact |
| Normalize vocabulary (synonyms) **tied to quoted spans** | Priority, effort, or risk without source |
| Propose **labeled** open questions for the client | Present guesses as if they were requirements |

**Strong patterns that satisfy PMO + devs:**

- **Evidence links:** Each task (or acceptance bullet) optionally references a **short quote or span** from the brief that supports it.
- **Gap register:** A dedicated section: *Clarifications needed* / *Blocked until answered* with concrete questions, not filler tasks that smuggle assumptions.
- **Explicit uncertainty:** Fields like `status: stated | unclear | not_in_brief` for sensitive attributes (timeline, integrations, roles, environments).

That turns “no assumptions” from a slogan into testable behavior.

## Refined functional requirements

1. **Input**
   - Paste text and/or upload a document (PDF/DOCX/TXT — product choice).
   - Optional metadata later (project name, client) — not required for v1 if you want speed.

2. **Processing**
   - Call an LLM (or pipeline) with a **strict system policy**: structure and decompose; **do not** add requirements; **do** emit gaps and questions.
   - Optional: chunking + retrieval for long briefs (hackathon scope may skip RAG first).

3. **Output A — structured breakdown**
   - Stable schema: e.g. initiative → epic → story → task, each with title, description, dependencies (only if stated), acceptance criteria **only from brief or marked TBD**.

4. **Output B — tickets**
   - Decide what “Jira tickets” means (see open questions below): API create, CSV, JSON import, or printable/markdown blocks.

5. **No authentication**
   - Implies: single-tenant or internal use, **no login** — but you should still treat **API keys and brief content** as sensitive (server-side secrets, minimal logging). This is a security posture decision, not a feature.

## Non-functional requirements (implied)

- **Trust:** PMO can defend every line to the client (traceability + gaps).
- **Latency:** Acceptable for batch “brief in → pack out” (seconds to a minute).
- **Correctness over completeness:** Better to under-specify with questions than over-specify with fiction.

## Open decisions (you should lock these before build)

1. **Jira:** Real **Jira Cloud/Server API** integration vs **export-only** (CSV/JSON/markdown) for PM to import manually?
2. **Ticket template:** Mandatory fields (project key, issue type, components, labels) — who supplies them if there’s no auth (hardcoded config vs form on each run)?
3. **Input formats:** Text-only v1 vs documents from day one?
4. **“Developer-ready” bar:** Do you require **test notes**, **API contracts**, **DB migrations** — or only **clear scope + AC + open questions**?
5. **Persistence:** Stateless “transform once” vs saved briefs/history (no auth makes history awkward unless anonymous session IDs).

## What you have to build (minimal vertical slice)

A thin but complete slice that proves the value:

1. **UI:** brief in → review structured breakdown + gap list → copy/export tickets.
2. **Backend:** one endpoint that sends brief + policy prompt to the model, validates response against a **strict JSON schema**, rejects or repairs invalid output.
3. **Policy layer in code:** post-check that flags empty AC, invented dates, or tasks without supporting quotes (heuristic or second-pass LLM “auditor” — optional for hackathon).

That aligns your hackathon scope with the PMO promise: **structure + tickets + explicit gaps**, with **no auth** and a clear interpretation of **no assumptions**.

If you want to go deeper next, the highest-leverage follow-up is: **pick Jira “real API” vs export-only** and **define your JSON schema for one issue type** — that single choice drives half the backend and UI.

---

**User**

create a list of functional and non functional requirements only

---

**Cursor**

## Functional requirements

1. Accept unstructured client brief input (at minimum: free-text paste; optionally file upload if in scope).
2. Parse and analyze the brief using an AI pipeline to produce a structured work breakdown (e.g. hierarchy of initiatives/epics/stories/tasks—exact levels are a product choice).
3. For each work item, include title and description derived only from stated brief content; do not invent scope, integrations, timelines, or environments not present in the source.
4. Produce explicit acceptance criteria only when supported by the brief; otherwise mark as missing/TBD or route to a gaps list.
5. Maintain a **gaps / clarifications** artifact: questions and unknowns the client must answer before implementation, instead of guessing.
6. Support **traceability** from derived tasks to the brief (e.g. supporting quotes or references)—so PMO can justify each line item.
7. Generate **developer-ready tickets** in a defined format (fields such as summary, description, acceptance criteria, dependencies, labels—aligned to your chosen Jira/export model).
8. Provide **export or handoff** of tickets (e.g. copy, file download, Jira API, or import-ready CSV/JSON—per product decision).
9. Allow the user to review and refine outputs in the UI before export (recommended for PMO workflow).
10. Operate **without user authentication** (no login/signup; access model is implicit single-tenant or open internal use).

---

## Non-functional requirements

1. **Correctness / trust:** Prefer incomplete output plus explicit gaps over silently inferred requirements (“no assumptions” as a behavioral standard).
2. **Security / privacy:** Protect brief content and LLM/API credentials; avoid logging full briefs in plaintext where not required.
3. **Reliability:** Graceful handling of model failures, timeouts, and malformed responses (validation/retry or user-visible errors).
4. **Performance:** End-to-end transformation completes within an acceptable bound for PMO use (define SLA, e.g. under 1–2 minutes for typical briefs).
5. **Usability:** Clear presentation of hierarchy, gaps, and export actions for non-developer PMO users.
6. **Maintainability:** Stable API/contracts for request/response (e.g. schema for breakdown and tickets) to allow UI and integrations to evolve.
7. **Observability (optional but valuable):** Basic metrics/logging for errors and latency without storing sensitive brief text unnecessarily.
8. **Compliance / data handling:** Define retention and whether briefs/results are stored; if no auth, document risk and mitigations (network placement, API keys, rate limits).

---

**User**

i didnt understood the 4 bullet point in the functional requirements where you said  Produce explicit acceptance criteria only when supported by the brief; otherwise mark as missing/TBD or route to a gaps list. please explain it in more details. 

---

**Cursor**

Here is what that requirement is trying to prevent and how the three outcomes differ.

## What “acceptance criteria” means here

Acceptance criteria (AC) are the **testable conditions** that say “we’re done when…”. Example: “User can reset password from the login screen and receives an email within 60 seconds.”

Your product rule is: **the system must not invent AC** that the client never said. PMOs and developers hate AC that sound official but were actually guessed by the model.

## Three allowed behaviors (that’s what the bullet combines)

### 1. **Produce explicit AC when supported by the brief**

If the brief actually states something you can turn into checkable conditions, you **include** those AC and they should be **traceable** to the brief (same wording or a short quote).

**Example brief fragment:** “Managers must approve expenses over $500 before payment.”

**Supported AC:** “Expenses ≤ $500 can proceed without manager approval; expenses > $500 require manager approval before payment.”

That is not a guess; it is a direct unpacking of what they wrote.

### 2. **Mark as missing / TBD on the ticket itself**

When the work item is real (the brief says “build an expense module”) but the brief **does not** say how success is measured, the ticket should still exist, but AC should be **honestly empty or labeled**, e.g.:

- “Acceptance criteria: **TBD — not specified in brief**”  
  or  
- A structured field like `acceptance_criteria: null` with a flag `source: not_in_brief`

So the developer sees: **there is a task, but nobody has defined “done” yet.** That pushes the PMO to go back to the client instead of trusting fake AC.

### 3. **Route to a gaps list (clarifications)**

Some missing AC are **questions**, not empty fields. Those belong in a **separate “gaps / clarifications” list** so they are visible in one place for the client call.

**Same expense example but briefer brief:** “We need an expense module.”

You might **not** invent AC about approvals, currencies, or receipts. Instead:

- Ticket: “Implement expense module” with AC = TBD / not in brief.  
- **Gaps list:** “What approval rules apply (thresholds, roles)? Which payment methods? Multi-currency? Receipt capture required?”

So: **TBD on the ticket** = “we acknowledge this is undefined on the artifact.” **Gaps list** = “here are the specific questions to resolve.”

Often you use **both**: TBD on the ticket **and** the same theme appears as numbered questions in the gaps list.

## Why one bullet mentions all three

They are **one policy** with three outputs:

| Situation | What the system does |
|-----------|----------------------|
| Brief gives enough detail for checkable “done” conditions | Emit real AC |
| Brief implies work but not “done” conditions | Emit work item + AC marked missing/TBD |
| Missing detail blocks clarity or planning | Also add concrete questions to the gaps list |

## Tiny contrast (why this matters)

**Bad (violates your rule):** Brief says “login page.” Model adds AC: “OAuth2 with Google and MFA” because that’s “normal.” That is **assumption**.

**Good:** Brief says “login page.” AC: TBD / not in brief. Gaps: “Single sign-on required? Which IdPs? MFA required?”

That is the whole idea of point 4: **only promote text to AC when the brief actually supports it; otherwise be explicit that it’s unknown and surface questions.**

---

**User**

create a plan to build this project

---

**Cursor**

Exploring the project structure so the plan matches the repository.



One decision significantly changes backend scope and secrets handling. Asking before we finalize the plan.



**Jira handoff scope**

> **How should "Jira tickets" be delivered in v1?**
> - Export only: JSON/CSV/Markdown (PM imports or pastes into Jira manually) — fastest for hackathon ✔
> - Jira REST API: create issues in a real Jira project (needs site URL, project key, API token/auth)

Incorporating export-only Jira handoff into the plan.



---

**User**

no need to use Zod keep it simple for workitems, and use these api keys from the .env file in the backend. these are the key names. (OPENAI_API_KEY, OPENAI_MODEL). 

---

**Cursor**

Updating the plan document to drop Zod, simplify work-item validation, and specify `OPENAI_API_KEY` and `OPENAI_MODEL`.



Updating the plan: removing Zod, specifying lightweight work-item checks, and locking environment variables to `OPENAI_API_KEY` and `OPENAI_MODEL`.



Here is what changed in the plan ([`brief-to-tickets_build_64411e3a.plan.md`](/Users/brainxflutter/.cursor/plans/brief-to-tickets_build_64411e3a.plan.md)):

**Zod removed**  
- Validation is **TypeScript types + a small `validateBriefOutput()`** (arrays, required fields, basic shape).  
- Optional second LLM pass is still allowed for **broken JSON / shape**, not a schema library.

**Env / OpenAI**  
- Backend reads **`OPENAI_API_KEY`** and **`OPENAI_MODEL`** from [`backend/.env`](backend/.env) via **`ConfigService`**.  
- README / `.env.example` call out only those two plus `PORT` and `FRONTEND_ORIGIN`.

**Diagram & files**  
- `SchemaValidator` → `validateBriefOutput`; `LlmClient` → `OpenAIClient`.  
- Dropped `brief/schemas/brief-output.schema.ts`; added `brief-output.types.ts` and `validate-brief-output.ts`.

**Todos**  
- `contract-schema` and `tests-docs` no longer mention Zod; tests target `validateBriefOutput` and mocked e2e.

If you want the same plan file copied into the repo (e.g. `docs/plan.md`), say so and we can add that when you switch to execution.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

Implementing the plan: starting with types and validation, then the backend API, OpenAI integration, frontend, and tests.



Creating types and validation, then installing backend dependencies and wiring the module.



Fixing acceptance-criterion normalization: treat `stated` only when `evidenceQuote` is a valid brief substring.



Adding the DTO, OpenAI client, prompts, service, controller, module, and updating `app.module` and `main.ts`.



Implementing the frontend: adding types, updating `vite.config.ts`, and replacing `App.tsx` and `App.css`.



Here is what was implemented and how to run it.

### Backend ([`backend/src/brief/`](backend/src/brief/))
- **`brief-output.types.ts`** — Contract: `schemaVersion`, `summary`, `assumptionsPolicy`, `workItems` (epic/story/task), `gaps`.
- **`validate-brief-output.ts`** — Plain checks + normalization; AC with bogus `evidenceQuote` vs the brief is downgraded to **tbd**; substring check uses collapsed whitespace.
- **`openai-brief.client.ts`** — Chat Completions + `response_format: json_object`, using **`OPENAI_API_KEY`** and **`OPENAI_MODEL`** from env.
- **`brief-prompts.ts`** + **`brief.service.ts`** — Strict system prompt, brief in `<<<BRIEF>>>…<<<END BRIEF>>>`, one **repair** call if JSON parse or validation fails; strips fenced markdown if the model adds it.
- **`brief.controller.ts`** — `POST /briefs/transform` with [`TransformBriefDto`](backend/src/brief/dto/transform-brief.dto.ts) (`class-validator`, max 100k chars).
- **[`backend/src/main.ts`](backend/src/main.ts)** — `bodyParser: false`, Express **`json`/`urlencoded` limit 512kb**, global **`ValidationPipe`**, CORS from **`FRONTEND_ORIGIN`** (default `http://localhost:5173`).
- **[`backend/src/app.module.ts`](backend/src/app.module.ts)** — `ConfigModule.forRoot({ isGlobal: true })`, `BriefModule`.
- **[`backend/.env.example`](backend/.env.example)** — Documents required keys.
- **[`backend/README.md`](backend/README.md)** — API + env table + CSV column note.
- **Tests** — [`validate-brief-output.spec.ts`](backend/src/brief/validate-brief-output.spec.ts); e2e mocks `OpenaiBriefClient` in [`test/app.e2e-spec.ts`](backend/test/app.e2e-spec.ts).

### Frontend
- **[`frontend/vite.config.ts`](frontend/vite.config.ts)** — Proxy `/api` → `http://localhost:3000` (path rewrite strips `/api`).
- **[`frontend/src/App.tsx`](frontend/src/App.tsx)** — Brief textarea, generate, tabs (Overview / Work tree / Gaps / Export), tree with expand/collapse, copy + download JSON, CSV, Markdown.
- **[`frontend/src/export-utils.ts`](frontend/src/export-utils.ts)** — CSV uses `issue_key_placeholder`, `summary`, `description`, `acceptance_criteria`, `labels`, `depends_on` (documented in UI hint).
- **`VITE_API_URL`** — Optional full API origin; otherwise **`/api/briefs/transform`** in dev.
- **[`frontend/README.md`](frontend/README.md)** — Dev + proxy notes; **[`frontend/index.html`](frontend/index.html)** — title updated.

### How to run
1. In **`backend/.env`**: set `OPENAI_API_KEY` and `OPENAI_MODEL` (see `.env.example`).
2. `cd backend && npm run start:dev`
3. `cd frontend && npm run dev` → open the app, paste a brief, **Generate breakdown**.

All related todos are **completed**; the plan file was not modified.


# Demo Mode

## What Demo Mode Does

Demo mode (`VITE_DEMO_MODE=true`) allows the app to run with **no Azure OpenAI API key** and **no network connectivity to AI providers**. It is designed for live event demos and presentations.

### What IS stubbed (recorded fixtures):
- **Lesson plan generation** — returns pre-recorded JSON from `src/fixtures/lessonPlan.json`
- **Group lesson plan generation** — returns pre-recorded JSON from `src/fixtures/groupLessonPlan.json`
- **Quiz generation** — returns pre-recorded JSON from `src/fixtures/quiz.json`
- **Related problems generation** — returns pre-recorded JSON from `src/fixtures/relatedProblems.json`
- **AI analytics** — returns a generic placeholder from `src/fixtures/generic.json`

### What is NOT stubbed (real computation):
- **Student grouping** — runs the real deterministic grouping algorithm (`buildGroupsByExactStruggles`) on real quiz answer data. No AI call is made. The grouping you see on stage is computed live from actual student assessment results.
- **Supabase database** — all reads and writes to Supabase (student data, quiz attempts, exit tickets, lesson plan storage) continue to work normally.
- **Authentication** — teacher, admin, coach, and mentor logins are unaffected.

### Explicit statement
**Grouping is real computation. Lesson plans are recorded output.**

## How to Enable

1. Set `VITE_DEMO_MODE=true` in your `.env` file.
2. Remove or leave blank `VITE_AZURE_OPENAI_API_KEY` — it will not be read.
3. Run `npm run dev` (or build and preview).

## How to Capture Fixtures

Before the event, run the fixture capture harness against the real Azure OpenAI endpoint:

```bash
# Make sure your .env has real Azure OpenAI credentials
npm run capture:fixtures
```

This calls each of the five prompt builders with representative input and writes the raw model responses into `src/fixtures/`. Replace the placeholder fixtures with these real recordings before the event.

## Fixture Files

| File | Category | Used by |
|------|----------|---------|
| `src/fixtures/grouping.json` | Grouping | `src/services/openai/fixtures.ts` |
| `src/fixtures/lessonPlan.json` | Lesson plan | `src/services/openai/fixtures.ts` |
| `src/fixtures/groupLessonPlan.json` | Group lesson plan | `src/services/openai/fixtures.ts` |
| `src/fixtures/quiz.json` | Quiz generation | `src/services/openai/fixtures.ts` |
| `src/fixtures/relatedProblems.json` | Related problems | `src/services/openai/fixtures.ts` |
| `src/fixtures/generic.json` | Fallback / analytics | `src/services/openai/fixtures.ts` |

## Presenter Pre-Flight Checklist

Before going on stage:

- [ ] `VITE_DEMO_MODE=true` is set in `.env`
- [ ] No `VITE_AZURE_OPENAI_API_KEY` is present in the environment
- [ ] `npm run build` succeeds with no errors
- [ ] App loads with no console errors about missing AI credentials
- [ ] A student can take an assessment and submit it
- [ ] A teacher can view results and item analysis
- [ ] Group generation completes in ~2.5 seconds
- [ ] Lesson plan generation completes in ~3 seconds
- [ ] The "DEMO" badge is visible in the bottom-left corner
- [ ] Fixtures in `src/fixtures/` have been replaced with real recorded model output (run `npm run capture:fixtures` against real data)
- [ ] Network can be fully disconnected and all AI-dependent features still work

## Build Guard

The `prebuild` npm script runs `scripts/check-ai-imports.mjs`, which fails the build if any file under `src/` (other than `src/services/openai/config.ts`) imports the `openai` package directly or makes a fetch call to an OpenAI or Azure OpenAI hostname. This prevents a new unstubbed AI call path from being added.

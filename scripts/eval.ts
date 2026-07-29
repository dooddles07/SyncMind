// Real eval harness (docs/AI-PIPELINE.md section 8). Calls the live Groq
// analysis path against 5 hand-labeled fixtures and scores it. Deliberately
// NOT wired into ci.yml or `npm test` -- it spends real Groq tokens and is
// meant to be run manually before any prompt change ships.
//
// Run: npm run eval   (needs GROQ_API_KEY in .env.local)
import { runAnalysisModel } from "@/server/controllers/analysis-controller";
import { meetingFixtures, type ExpectedActionItem, type MeetingFixture } from "@/tests/fixtures/meetings";

const TARGETS = { recall: 0.85, precision: 0.9, ownerAccuracy: 0.9, dateAccuracy: 0.95 };

type GeneratedItem = { title: string; owner: string | null; dueDate: string | null };

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

/** Jaccard word overlap -- expected and generated titles are rarely worded
 *  identically ("Send the invoice" vs "Follow up on invoice with vendor"), so
 *  exact/edit-distance matching (the duplicate-merge rule's `isNearDuplicate`)
 *  is too strict here. 0.3 threshold picked empirically against the fixtures
 *  above. */
function titleSimilarity(a: string, b: string): number {
  const wa = titleWords(a);
  const wb = titleWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / new Set([...wa, ...wb]).size;
}

function matchItems(
  expected: ExpectedActionItem[],
  generated: GeneratedItem[],
): { expected: ExpectedActionItem; generated: GeneratedItem | null }[] {
  const usedGenerated = new Set<number>();
  return expected.map((exp) => {
    let bestIdx = -1;
    let bestScore = 0.3; // similarity threshold
    generated.forEach((gen, idx) => {
      if (usedGenerated.has(idx)) return;
      const score = titleSimilarity(exp.title, gen.title);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    if (bestIdx === -1) return { expected: exp, generated: null };
    usedGenerated.add(bestIdx);
    return { expected: exp, generated: generated[bestIdx] };
  });
}

async function evalFixture(fixture: MeetingFixture) {
  const { analysis } = await runAnalysisModel(fixture, fixture.segments);
  const generated: GeneratedItem[] = analysis.actionItems.map((i) => ({
    title: i.title,
    owner: i.owner,
    dueDate: i.dueDate,
  }));

  const matches = matchItems(fixture.expected.actionItems, generated);
  const matchedCount = matches.filter((m) => m.generated !== null).length;

  const ownerable = matches.filter((m) => m.generated && m.expected.owner !== null);
  const ownerCorrect = ownerable.filter((m) => m.generated!.owner === m.expected.owner).length;

  const dateable = matches.filter((m) => m.generated && m.expected.dueDate !== null);
  const dateCorrect = dateable.filter((m) => m.generated!.dueDate === m.expected.dueDate).length;

  return {
    name: fixture.name,
    expectedCount: fixture.expected.actionItems.length,
    generatedCount: generated.length,
    matchedCount,
    ownerable: ownerable.length,
    ownerCorrect,
    dateable: dateable.length,
    dateCorrect,
    hallucinated: fixture.expected.actionItems.length === 0 && generated.length > 0,
  };
}

async function main() {
  const rows = [];
  for (const fixture of meetingFixtures) {
    process.stderr.write(`Running ${fixture.name}...\n`);
    rows.push(await evalFixture(fixture));
  }

  console.table(
    rows.map((r) => ({
      fixture: r.name,
      expected: r.expectedCount,
      generated: r.generatedCount,
      matched: r.matchedCount,
    })),
  );

  const totalExpected = rows.reduce((s, r) => s + r.expectedCount, 0);
  const totalGenerated = rows.reduce((s, r) => s + r.generatedCount, 0);
  const totalMatched = rows.reduce((s, r) => s + r.matchedCount, 0);
  const totalOwnerable = rows.reduce((s, r) => s + r.ownerable, 0);
  const totalOwnerCorrect = rows.reduce((s, r) => s + r.ownerCorrect, 0);
  const totalDateable = rows.reduce((s, r) => s + r.dateable, 0);
  const totalDateCorrect = rows.reduce((s, r) => s + r.dateCorrect, 0);
  const hallucinations = rows.filter((r) => r.hallucinated).map((r) => r.name);

  const recall = totalExpected > 0 ? totalMatched / totalExpected : 1;
  const precision = totalGenerated > 0 ? totalMatched / totalGenerated : 1;
  const ownerAccuracy = totalOwnerable > 0 ? totalOwnerCorrect / totalOwnerable : 1;
  const dateAccuracy = totalDateable > 0 ? totalDateCorrect / totalDateable : 1;

  const summary = [
    { metric: "Action item recall", score: recall, target: TARGETS.recall },
    { metric: "Action item precision", score: precision, target: TARGETS.precision },
    { metric: "Owner accuracy", score: ownerAccuracy, target: TARGETS.ownerAccuracy },
    { metric: "Date accuracy", score: dateAccuracy, target: TARGETS.dateAccuracy },
  ];

  console.table(
    summary.map((s) => ({
      metric: s.metric,
      score: s.score.toFixed(2),
      target: s.target,
      pass: s.score >= s.target ? "PASS" : "FAIL",
    })),
  );

  console.log(
    hallucinations.length === 0
      ? "Hallucination check: PASS (rambling fixture produced 0 action items)"
      : `Hallucination check: FAIL (${hallucinations.join(", ")} produced action items with none expected)`,
  );

  const failed = summary.some((s) => s.score < s.target) || hallucinations.length > 0;
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

/*
  Integration check for canonical redirect.
  Requires backend running at http://localhost:4000 and an existing job id.
  Usage:
    JOB_ID=job_123 EXPECTED_SLUG="senior-eng-at-acme-job_123" npm run test:redirect
*/

const BASE = process.env.API_BASE_URL || 'http://localhost:4000/api';
const JOB_ID = process.env.JOB_ID;
const EXPECTED_SLUG = process.env.EXPECTED_SLUG; // optional

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function main() {
  if (!JOB_ID) {
    console.log('Skip: set JOB_ID environment variable to run this test');
    process.exit(0);
  }

  // 1) Request by id: should be 200 and return a job with id
  let res = await fetch(`${BASE}/jobs/${JOB_ID}`, { redirect: 'manual' });
  assert(res.status === 200, `GET by id expected 200, got ${res.status}`);
  const job = await res.json();
  assert(job && job.id === JOB_ID, 'Response did not include the expected job');
  if (EXPECTED_SLUG) {
    assert(job.slug === EXPECTED_SLUG, 'Job slug does not match EXPECTED_SLUG');
  }

  // 2) If we have a slug, hit with a mismatching slug to expect 301
  const bogusSlug = EXPECTED_SLUG ? EXPECTED_SLUG + '-extra' : `job-${JOB_ID}-x`;
  res = await fetch(`${BASE}/jobs/${bogusSlug}`, { redirect: 'manual' });
  if (EXPECTED_SLUG) {
    assert(res.status === 301, `Expected 301 for mismatched slug, got ${res.status}`);
    const loc = res.headers.get('location') || res.headers.get('Location');
    assert(loc && loc.endsWith(`/jobs/${EXPECTED_SLUG}`), `Canonical Location header unexpected: ${loc}`);
  } else {
    // If no EXPECTED_SLUG provided, allow 200 (id fallback) or 301 (if slug exists)
    assert(res.status === 200 || res.status === 301, `Expected 200 or 301, got ${res.status}`);
  }

  console.log('✅ Canonical redirect check passed.');
}

main().catch((e) => {
  console.error('❌ Redirect test failed:', e);
  process.exit(1);
});



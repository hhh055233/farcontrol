#!/usr/bin/env node
/**
 * Staging-only 30-device end-to-end test for Steve Control.
 *
 * Required environment:
 *   SUPABASE_URL=https://<staging-project-ref>.supabase.co
 *   SUPABASE_ANON_KEY=<staging anon key>
 *   STEVE_STAGING_PROJECT_REF=<staging project ref>
 *   STEVE_TEST_TEACHER_JWT=<staging teacher access token>
 *   STEVE_TEST_CHILD_ID=<staging device-group UUID>
 *   STEVE_TEST_DEVICES_JSON='[{"id":"<uuid>","token":"<device-token>"}, ... 30 entries]'
 *
 * Run: node scripts/load-test-30-devices.mjs
 *
 * This queues visible test notices and polls/acknowledges them. Use only
 * dedicated staging devices, never production or student devices.
 */

const PRODUCTION_PROJECT_REF = "gjopwszrjdcxhtflhbkj";
const TARGET = 30;
const ROUNDS = 3;
const TEST_MESSAGE_PREFIX = "Steve Control staging capacity test";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const stagingRef = process.env.STEVE_STAGING_PROJECT_REF;
const teacherJwt = process.env.STEVE_TEST_TEACHER_JWT;
const childId = process.env.STEVE_TEST_CHILD_ID;
const rawDevices = process.env.STEVE_TEST_DEVICES_JSON;

if (!supabaseUrl || !anonKey || !stagingRef || !teacherJwt || !childId || !rawDevices) {
  fail("Missing one or more required staging environment variables.");
}
if (stagingRef === PRODUCTION_PROJECT_REF) {
  fail("Refusing to run against the production Steve Control project.");
}

let endpoint;
try {
  endpoint = new URL(supabaseUrl);
} catch {
  fail("SUPABASE_URL is not a valid URL.");
}
if (endpoint.protocol !== "https:" || endpoint.hostname !== `${stagingRef}.supabase.co`) {
  fail("SUPABASE_URL must be the HTTPS URL for STEVE_STAGING_PROJECT_REF.");
}
if (!/^[0-9a-f-]{36}$/i.test(childId)) fail("STEVE_TEST_CHILD_ID must be a UUID.");
if (teacherJwt.length < 32) fail("Teacher JWT is missing or invalid.");

let devices;
try {
  devices = JSON.parse(rawDevices);
} catch {
  fail("STEVE_TEST_DEVICES_JSON must be valid JSON.");
}
if (!Array.isArray(devices) || devices.length !== TARGET) {
  fail(`Exactly ${TARGET} test devices are required.`);
}
const ids = new Set();
for (const device of devices) {
  if (!device || typeof device.id !== "string" || !/^[0-9a-f-]{36}$/i.test(device.id)) {
    fail("Every test device must have a UUID id.");
  }
  if (typeof device.token !== "string" || device.token.length < 32 || device.token.length > 256) {
    fail("Every test device must have a valid device token.");
  }
  if (ids.has(device.id)) fail("Duplicate device IDs are not allowed.");
  ids.add(device.id);
}

const headers = (bearer) => ({
  "Content-Type": "application/json",
  apikey: anonKey,
  Authorization: `Bearer ${bearer}`,
});

async function post(path, bearer, body) {
  const started = performance.now();
  const response = await fetch(new URL(`/functions/v1/${path}`, endpoint), {
    method: "POST",
    headers: headers(bearer),
    body: JSON.stringify(body),
  });
  const elapsedMs = performance.now() - started;
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  return { ok: response.ok, status: response.status, elapsedMs, payload };
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)].toFixed(1));
}

const timings = [];
const failures = [];
let totalQueued = 0;
let totalAcknowledged = 0;

console.log(`Running ${ROUNDS} staging rounds with ${TARGET} devices (${TARGET * ROUNDS} device deliveries).`);

for (let round = 1; round <= ROUNDS; round++) {
  const message = `${TEST_MESSAGE_PREFIX} — round ${round}. Ignore this test notice.`;
  const queued = await post("family-api", teacherJwt, {
    action: "send_notice",
    childId,
    message,
    deviceIds: devices.map((device) => device.id),
  });
  timings.push(queued.elapsedMs);
  if (!queued.ok || queued.payload?.queued !== TARGET) {
    fail(`Round ${round}: notice fan-out did not queue exactly ${TARGET} devices (HTTP ${queued.status}, queued ${queued.payload?.queued ?? "unknown"}). Check staging group membership.`);
  }
  totalQueued += queued.payload.queued;

  const polled = await Promise.all(devices.map(async (device) => {
    const result = await post("device-command-api", device.token, { action: "poll" });
    timings.push(result.elapsedMs);
    if (!result.ok) return { device, error: `poll HTTP ${result.status}` };
    const commands = result.payload?.commands;
    if (!Array.isArray(commands) || commands.length !== 1) {
      return { device, error: `expected one command, received ${Array.isArray(commands) ? commands.length : "invalid response"}` };
    }
    if (commands[0].command_type !== "show_notice" || commands[0].payload?.message !== message) {
      return { device, error: "received an unexpected command payload" };
    }
    return { device, commandId: commands[0].id };
  }));

  const roundFailures = polled.filter((item) => item.error);
  if (roundFailures.length) {
    failures.push(...roundFailures.map((item) => `round ${round}, device ${item.device.id}: ${item.error}`));
    fail(`Round ${round}: ${roundFailures.length} device poll(s) failed. Staging run stopped; inspect the test environment before retrying.`);
  }

  const acknowledgements = await Promise.all(polled.map(async (item) => {
    const result = await post("device-command-api", item.device.token, {
      action: "acknowledge",
      commandId: item.commandId,
      result: "acknowledged",
    });
    timings.push(result.elapsedMs);
    return { deviceId: item.device.id, ok: result.ok && result.payload?.acknowledged === true, status: result.status };
  }));

  const failedAcks = acknowledgements.filter((item) => !item.ok);
  if (failedAcks.length) {
    fail(`Round ${round}: ${failedAcks.length} acknowledgement(s) failed.`);
  }
  totalAcknowledged += acknowledgements.length;
  console.log(`Round ${round}/${ROUNDS}: queued ${queued.payload.queued}, polled ${polled.length}, acknowledged ${acknowledgements.length}.`);
}

console.log(JSON.stringify({
  result: failures.length ? "failed" : "passed",
  stagingProjectRef: stagingRef,
  devices: TARGET,
  rounds: ROUNDS,
  queuedCommands: totalQueued,
  acknowledgedCommands: totalAcknowledged,
  requests: timings.length,
  latencyMs: {
    p50: percentile(timings, 0.50),
    p95: percentile(timings, 0.95),
    p99: percentile(timings, 0.99),
    max: Number(Math.max(...timings).toFixed(1)),
  },
  failures,
}, null, 2));

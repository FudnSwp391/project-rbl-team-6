// ── Finding key resolution (Batch 37) ────────────────────────────────────────
// Reconciliation checks/items are computed live (never persisted) — same
// design as the Batch 35 fraud-alert system. A finding_key is deterministic
// ("check:<check-id>" | "item:<item-id>", item-id already unique across both
// withdrawal ("wd-<uuid>") and large-transaction (raw uuid) review items), so
// investigation state (status/severity/AI cache/audit log) can key off it
// safely via the reconciliation_investigations anchor table without needing
// to duplicate the reconciliation computation itself.
const { computeReconciliation } = require('./computeReconciliation');
const { computeSeverity } = require('./severity');

function buildFindingKey(type, id) {
  if (type !== 'check' && type !== 'item') throw new Error(`Invalid finding type: ${type}`);
  return `${type}:${id}`;
}

function parseFindingKey(findingKey) {
  if (typeof findingKey !== 'string') return null;
  const idx = findingKey.indexOf(':');
  if (idx === -1) return null;
  const type = findingKey.slice(0, idx);
  const id = findingKey.slice(idx + 1);
  if ((type !== 'check' && type !== 'item') || !id) return null;
  return { type, id };
}

// Re-derives the full reconciliation snapshot live, then returns the one
// check/item matching findingKey plus the severity computed from its
// difference/amount. Returns null if the key is malformed or no longer
// matches any current check/item (e.g. a large-transaction item that has
// aged out of the top-20 list).
async function resolveFinding(pool, findingKey) {
  const parsed = parseFindingKey(findingKey);
  if (!parsed) return null;
  const computed = await computeReconciliation(pool);

  if (parsed.type === 'check') {
    const check = computed.checks.find(c => c.id === parsed.id);
    if (!check) return null;
    return {
      findingKey,
      findingType: 'check',
      finding: check,
      difference: check.difference,
      severity: computeSeverity(check.difference),
      computed,
    };
  }

  const item = computed.items.find(it => String(it.id) === parsed.id);
  if (!item) return null;
  return {
    findingKey,
    findingType: 'item',
    finding: item,
    difference: item.amount,
    severity: computeSeverity(item.amount),
    computed,
  };
}

module.exports = { buildFindingKey, parseFindingKey, resolveFinding };

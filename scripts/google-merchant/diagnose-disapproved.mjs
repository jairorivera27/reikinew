/**
 * Diagnóstico de productos no aprobados vía Merchant API (products.list → productStatus).
 *
 * Uso: node scripts/google-merchant/diagnose-disapproved.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listProductStatuses } from './insert-product.mjs';
import { MERCHANT_ID } from './config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'data', '_tmp-merchant-disapproved.json');

function destinationSummary(destStatuses = []) {
  return destStatuses.map((d) => {
    const ctx = d.reportingContext || d.destination || '?';
    const parts = [];
    if (d.approvedCountries?.length) parts.push(`approved:${d.approvedCountries.join(',')}`);
    if (d.pendingCountries?.length) parts.push(`pending:${d.pendingCountries.join(',')}`);
    if (d.disapprovedCountries?.length) {
      parts.push(`disapproved:${d.disapprovedCountries.join(',')}`);
    }
    if (!parts.length && d.status) parts.push(String(d.status));
    return `${ctx}: ${parts.join(' | ') || '(sin países)'}`;
  });
}

function collectIssues(statusLike) {
  const raw = statusLike.itemLevelIssues || statusLike.productStatus?.itemLevelIssues || [];
  return raw.map((item) => ({
    code: item.code || 'unknown',
    severity: item.severity || 'unknown',
    attribute: item.attribute || item.attributeName,
    detail: item.detail || item.description || '',
    resolution: item.resolution,
    reportingContext: item.reportingContext,
  }));
}

function isNotFullyApproved(entry) {
  const dests = entry.destinationStatuses || [];
  const issues = collectIssues(entry);

  const hasDisapproved = dests.some((d) => d.disapprovedCountries?.length);
  const hasPending = dests.some((d) => d.pendingCountries?.length);
  const onlyPendingIssues = issues.every((i) =>
    /pending|review/i.test(`${i.code} ${i.detail}`)
  );
  const hasBlocking = issues.some((i) => /DISAPPROVED|demoted/i.test(String(i.severity)));

  if (!dests.length && !issues.length) {
    return { flag: true, reason: 'sin_status_aún' };
  }
  if (hasDisapproved || hasBlocking) return { flag: true, reason: 'disapproved' };
  if (hasPending) return { flag: true, reason: 'pending' };
  if (issues.length && !onlyPendingIssues) return { flag: true, reason: 'issues' };
  if (issues.length) return { flag: true, reason: 'pending_review' };
  return { flag: false };
}

async function main() {
  console.log('Merchant ID:', MERCHANT_ID);
  console.log('Listando products (Merchant API)…');

  const statuses = await listProductStatuses({ limit: 5000 });
  console.log('Total productos:', statuses.length);

  /** @type {any[]} */
  const notApproved = [];
  /** @type {Record<string, number>} */
  const reasonCounts = {};
  /** @type {Record<string, number>} */
  const issueCodeCounts = {};

  for (const st of statuses) {
    const check = isNotFullyApproved(st);
    if (!check.flag) continue;

    const issues = collectIssues(st);
    for (const iss of issues) {
      issueCodeCounts[iss.code] = (issueCodeCounts[iss.code] || 0) + 1;
    }

    notApproved.push({
      productId: st.productId || st.name,
      offerId: st.offerId,
      title: st.title,
      link: st.link,
      destinations: destinationSummary(st.destinationStatuses),
      issues,
      flagReason: check.reason,
    });
    reasonCounts[check.reason] = (reasonCounts[check.reason] || 0) + 1;
  }

  const summary = {
    checkedAt: new Date().toISOString(),
    merchantId: MERCHANT_ID,
    api: 'Merchant API products.list',
    totalStatuses: statuses.length,
    notApprovedCount: notApproved.length,
    reasonCounts,
    topIssueCodes: Object.entries(issueCodeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([code, count]) => ({ code, count })),
    samples: notApproved.slice(0, 40),
  };

  fs.writeFileSync(OUT, JSON.stringify({ ...summary, all: notApproved }, null, 2));

  console.log('\n=== Resumen ===');
  console.log('No aprobados / pendientes / issues:', notApproved.length);
  console.log('Por motivo:', reasonCounts);
  console.log('Top issue codes:');
  for (const row of summary.topIssueCodes.slice(0, 15)) {
    console.log(`  ${row.count}× ${row.code}`);
  }

  if (notApproved.length) {
    console.log('\nMuestra (hasta 10):');
    for (const p of notApproved.slice(0, 10)) {
      console.log(`\n- ${p.title || p.offerId || p.productId}`);
      console.log(`  dest: ${p.destinations.join(' | ') || '(ninguno)'}`);
      for (const iss of p.issues.slice(0, 3)) {
        console.log(`  · [${iss.code}] ${iss.attribute || ''} ${iss.detail}`);
      }
    }
  }

  console.log('\nReporte:', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

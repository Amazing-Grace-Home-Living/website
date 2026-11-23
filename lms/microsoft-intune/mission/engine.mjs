// Intune Ops: Incident Command — entirely fictional, browser-only training data.
// No Intune tenant, Graph API, Firebase, login, or telemetry connection.
export const MISSION_STORAGE_KEY = 'amazing-grace-intune-incident-command-v1';
export const SCENARIOS = Object.freeze([
  {
    id: 'incomplete-report', category: 'Reporting', title: 'The disappearing devices',
    brief: 'The weekly endpoint inventory shows 42 fewer Windows devices, but no retirement requests exist.',
    evidence: ['Enrollment report totals were refreshed this morning.', 'Device check-in data was last exported yesterday.', 'No approved removal or offboarding change was logged.'],
    prompt: 'What should the operations lead do first?',
    options: [
      { id: 'compare-sources', label: 'Compare enrollment, check-in timestamps, filters, and export scope before drawing conclusions.', points: 100, feedback: 'Correct. Different reports and filters can produce different counts. Confirm scope and data freshness before acting.' },
      { id: 'ask-admin', label: 'Ask a tenant admin whether devices are missing, without checking report definitions.', points: 40, feedback: 'Escalating is reasonable, but gather report scope and freshness evidence first.' },
      { id: 'delete', label: 'Retire devices missing from the export to keep inventory counts aligned.', points: 0, feedback: 'Unsafe. Missing report rows do not prove a device should be retired.' },
    ],
    learn: 'https://learn.microsoft.com/en-us/training/modules/implement-reporting-data-visibility/'
  },
  {
    id: 'stale-compliant', category: 'Data quality', title: 'Green does not mean current',
    brief: 'The dashboard shows a set of compliant devices that have not checked in for several weeks.',
    evidence: ['Last check-in ages range from 16 to 41 days.', 'The compliance status was last evaluated before some devices went offline.', 'The executive report is due tomorrow.'],
    prompt: 'How should the discrepancy be reported?',
    options: [
      { id: 'split-status', label: 'Report compliance and check-in recency separately; flag stale data and investigate device connectivity.', points: 100, feedback: 'Correct. A past compliance result is not proof that a device is healthy today.' },
      { id: 'note-only', label: 'Keep the green chart but add a small footnote that data might be old.', points: 40, feedback: 'A caveat helps, but separate stale data from current compliance in the summary.' },
      { id: 'promise', label: 'Tell leadership all devices are secure because their last compliance result was green.', points: 0, feedback: 'Misleading. Stale check-ins weaken confidence in the status.' },
    ],
    learn: 'https://learn.microsoft.com/en-us/intune/device-management/reports/overview'
  },
  {
    id: 'delegation', category: 'RBAC', title: 'The regional help desk',
    brief: 'A regional support team needs to view and troubleshoot only the devices assigned to its business unit.',
    evidence: ['The team currently has no administrative role.', 'Other regions contain sensitive device records.', 'A help-desk scope and approval process are documented.'],
    prompt: 'Which access plan is safest?',
    options: [
      { id: 'least-privilege', label: 'Assign an appropriate Intune role and scope, including assignment groups and scope tags as needed.', points: 100, feedback: 'Correct. Intune RBAC combines permissions and scope to limit what an administrator can manage or see.' },
      { id: 'global-temporary', label: 'Give temporary tenant-wide permissions, then remove them after a few weeks.', points: 40, feedback: 'Temporary elevation may be justified for specific emergencies, but it is not a sound default access model.' },
      { id: 'shared-admin', label: 'Share a tenant-wide administrator account with the help desk to save setup time.', points: 0, feedback: 'Unsafe. Shared privileged credentials undermine accountability and least privilege.' },
    ],
    learn: 'https://learn.microsoft.com/en-us/training/modules/apply-rbac-admin-delegation/'
  },
  {
    id: 'secure-export', category: 'Data handling', title: 'The monthly compliance briefing',
    brief: 'A business stakeholder requests a recurring list of noncompliant devices with ownership details.',
    evidence: ['The audience includes external contractors.', 'The report contains device IDs and assigned user information.', 'No approved external-sharing process exists yet.'],
    prompt: 'How do you deliver useful reporting without oversharing?',
    options: [
      { id: 'approved-export', label: 'Confirm authorization, share a minimum-necessary summary, and use an approved access-controlled export.', points: 100, feedback: 'Correct. Minimize personal/device data and use approved, access-controlled distribution.' },
      { id: 'password-email', label: 'Email the full file with a password and tell recipients not to forward it.', points: 40, feedback: 'A password alone does not address audience authorization, minimization, retention, and tracking.' },
      { id: 'public-link', label: 'Post the file on a public sharing link so everyone can find the latest version.', points: 0, feedback: 'Unsafe. Sensitive device inventory should not be publicly exposed.' },
    ],
    learn: 'https://learn.microsoft.com/en-us/training/modules/implement-reporting-data-visibility/'
  },
  {
    id: 'tenant-incident', category: 'Tenant health', title: 'A sudden enrollment outage',
    brief: 'New devices fail enrollment across two regions at nearly the same time.',
    evidence: ['The failure began within one hour.', 'A service advisory may be in progress.', 'No configuration rollout is scheduled today.'],
    prompt: 'Which incident action should lead?',
    options: [
      { id: 'verify-health', label: 'Check tenant service health and advisories, gather failure evidence, and communicate the incident before modifying policies.', points: 100, feedback: 'Correct. Establish whether the issue is service-wide before making risky configuration changes.' },
      { id: 'reboot-all', label: 'Ask the affected users to reboot and retry without checking service status.', points: 40, feedback: 'A retry may help individual devices, but it does not explain a simultaneous regional failure.' },
      { id: 'disable-controls', label: 'Disable all enrollment and compliance controls until the error stops.', points: 0, feedback: 'Unsafe. Broad policy changes can create further risk and complicate incident response.' },
    ],
    learn: 'https://learn.microsoft.com/en-us/training/modules/maintain-tenant-health/'
  },
  {
    id: 'safe-change', category: 'Operational readiness', title: 'The remediation rollout',
    brief: 'A new endpoint remediation appears effective on five lab devices. Leadership asks for immediate deployment to every managed device.',
    evidence: ['The five test devices use the same model and OS build.', 'No rollback or change record exists.', 'The fleet includes multiple hardware and OS versions.'],
    prompt: 'Choose the responsible deployment strategy.',
    options: [
      { id: 'pilot-and-rollback', label: 'Document a baseline, pilot representative groups, monitor outcomes, and define a rollback and escalation plan.', points: 100, feedback: 'Correct. Representative pilots, monitoring and rollback reduce operational risk.' },
      { id: 'pilot-only', label: 'Deploy to a larger test group but omit the rollback plan to save time.', points: 40, feedback: 'A larger pilot helps, but rollback and monitoring are needed before broad deployment.' },
      { id: 'all-now', label: 'Deploy fleet-wide immediately because five lab devices succeeded.', points: 0, feedback: 'Unsafe. A small, homogeneous test does not establish fleet-wide readiness.' },
    ],
    learn: 'https://learn.microsoft.com/en-us/training/paths/support-operational-excellence-intune/'
  },
]);

export const MAX_POINTS = SCENARIOS.length * 100;
export const startMission = () => ({ version: 1, choices: [], best: 0 });

export function normalizeMission(raw) {
  const choices = [];
  if (raw?.version === 1 && Array.isArray(raw.choices)) {
    for (const [index, candidate] of raw.choices.entries()) {
      if (index >= SCENARIOS.length) break;
      if (typeof candidate !== 'string' || !SCENARIOS[index].options.some(option => option.id === candidate)) break;
      choices.push(candidate);
    }
  }
  const best = Number.isInteger(raw?.best) && raw.best >= 0 && raw.best <= MAX_POINTS ? raw.best : 0;
  return { version: 1, choices, best };
}

export function missionScore(state) {
  const safe = normalizeMission(state);
  return safe.choices.reduce((sum, choice, index) => (
    sum + (SCENARIOS[index].options.find(option => option.id === choice)?.points ?? 0)
  ), 0);
}

export function submitDecision(state, scenarioId, choiceId) {
  const current = normalizeMission(state);
  const scenario = SCENARIOS[current.choices.length];
  if (!scenario || scenario.id !== scenarioId) throw new Error('Decision is not for the active scenario');
  if (!scenario.options.some(option => option.id === choiceId)) throw new Error('Unknown decision');
  const next = { ...current, choices: [...current.choices, choiceId] };
  next.best = Math.max(next.best, missionScore(next));
  return next;
}

export const isComplete = state => normalizeMission(state).choices.length === SCENARIOS.length;

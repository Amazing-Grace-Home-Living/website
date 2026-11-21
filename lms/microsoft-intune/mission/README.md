# Intune Ops: Incident Command

A free, self-contained, browser-only incident-response game in Amazing Grace's Microsoft Endpoint Administration LMS.

## Gameplay

Six fictional operational cases covering **Intune reporting**, device check-in data quality, **RBAC and least privilege**, secure reporting exports, **tenant health**, and **safe change rollout**. Each case presents evidence and three decisions with contextual feedback. Scores: best action 100, partial/cautious action 40, risky action 0; 600 possible points. Decisions and personal best are stored only in browser localStorage under `amazing-grace-intune-incident-command-v1`, separate from the existing course checklist.

No Microsoft tenant, Graph token, Firebase account, provider key, backend, sign-in, personal data, or network request is used. A blocked/unavailable localStorage falls back to in-tab progress. The score is self-reported practice only and carries no certification or verified rewards.

## Links and source

- [Official Microsoft Learn operational excellence path](https://learn.microsoft.com/en-us/training/paths/support-operational-excellence-intune/)
- [Reporting and data visibility](https://learn.microsoft.com/en-us/training/modules/implement-reporting-data-visibility/)
- [Role-based access and administrative delegation](https://learn.microsoft.com/en-us/training/modules/apply-rbac-admin-delegation/)
- [Tenant health and readiness](https://learn.microsoft.com/en-us/training/modules/maintain-tenant-health/)

This is an independent original simulation; **not sponsored by or affiliated with Microsoft**. Real service permissions and procedures can vary by tenant and license. Never use unsanctioned production changes as training exercises.

## Verify

```bash
node --test tests/intune-incident-game.test.mjs
npx playwright test tests/intune-incident-game.spec.ts
```

The static site build includes `lms/`, so `/lms/microsoft-intune/mission/` is published with the rest of the website. Linked from the Intune course, LMS index, and arcade index. These pages do not change the housing homepage.

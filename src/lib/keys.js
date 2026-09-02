/* Storage key layout. Every key the app writes is minted here. */

export const CFG_KEY = "gac:config";
export const EMP_KEY = "gac:employees";
export const punchKey = (ym) => `gac:punches:${ym}`;
export const photoKeyFor = (ts, id) => `gac:photo:${ts}:${id}`;
export const signKeyFor = (periodStart, empId) => `gac:signature:${periodStart}:${empId}`;
export const attestKeyFor = (periodStart, empId) => `gac:attest:${periodStart}:${empId}`;
export const schedKeyFor = (weekStart) => `gac:schedule:${weekStart}`;

// Confirmation password required for high-risk operations (delete number, edit binding, unbind).
export const HIGH_RISK_ACTION_PASSWORD = 'aG0ra@2026'

export function verifyHighRiskPassword(input: string): boolean {
  return input === HIGH_RISK_ACTION_PASSWORD
}

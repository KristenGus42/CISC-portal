export const VALID_ROLES = ["Admin", "Staff", "Attorney", "Legal Student"];

export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

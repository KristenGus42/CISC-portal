export const VALID_ROLES = ["Admin", "Staff", "Attorney"];

export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

export type StaffRoleCode = "chairman" | "admin" | "doctor" | "operator";

export function canAccessReports(roleCode?: string | null) {
  return roleCode === "chairman";
}

export function canAccessSettings(roleCode?: string | null) {
  return roleCode === "chairman" || roleCode === "admin";
}

export function canManageStaff(roleCode?: string | null) {
  return roleCode === "chairman";
}

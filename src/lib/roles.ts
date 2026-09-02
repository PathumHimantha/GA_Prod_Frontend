// src/constants/roles.ts

export enum UserRole {
  EXECUTIVE = "executive",
  BRANCH_MANAGER = "branch_manager",
  ZONE_HEAD = "zone_head",
  REGIONAL_MANAGER = "regional_manager",
  ADMIN = "admin",
}

export interface RoleConfig {
  id: UserRole;
  name: string;
  requiresBranchSelection: boolean;
  level: number;
}

export const ROLE_CONFIG: RoleConfig[] = [
  {
    id: UserRole.EXECUTIVE,
    name: "Executive",
    requiresBranchSelection: false,
    level: 1,
  },
  {
    id: UserRole.BRANCH_MANAGER,
    name: "Branch Manager",
    requiresBranchSelection: false,
    level: 2,
  },
  {
    id: UserRole.ZONE_HEAD,
    name: "Zone Head",
    requiresBranchSelection: true,
    level: 3,
  },
  {
    id: UserRole.REGIONAL_MANAGER,
    name: "Regional Manager",
    requiresBranchSelection: true,
    level: 4,
  },
  {
    id: UserRole.ADMIN,
    name: "Administrator",
    requiresBranchSelection: false,
    level: 5,
  },
];

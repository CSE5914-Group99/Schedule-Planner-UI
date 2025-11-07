export interface UserBase {
  uid?: string;
  email?: string | null;
  displayName?: string | null;
}

export interface User extends UserBase {
  preferences?: string;
}

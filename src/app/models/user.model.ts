export interface User {
  id: number;
  username?: string;
  email?: string | null | undefined;
  password?: string;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  google_uid?: string | null;
  preferences?: string;
}

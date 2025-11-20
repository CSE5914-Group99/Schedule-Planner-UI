export interface User {
  google_uid: string;
  email?: string | null | undefined;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  preferences?: string;
}

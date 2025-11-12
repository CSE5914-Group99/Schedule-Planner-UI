export interface User {
  username?: string;
  email?: string | null | undefined;
  password?: string;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  google_uid?: string | null;
  // Represent preferences as an object to mirror backend (dict[str, Any])
  preferences?: Record<string, any> | null;
}

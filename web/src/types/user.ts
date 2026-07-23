export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  profilePicUrl?: string;
  bio?: string;
  interests?: string[];
  ageRange?: string;
  roles?: string[];
  createdAt?: string;
}

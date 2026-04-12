export interface User {
  id: number;
  email: string;
  fullname?: string;
  profileImage?: string;
  role?: string;
  status?: string;
}

export interface Admin {
  id: number;
  email: string;
  fullname: string;
  role: string;
  status: string;
}

export interface SearchResult {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}
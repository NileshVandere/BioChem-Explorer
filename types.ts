export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string;
  tags: string[];
}

export interface Source {
  uri: string;
  title: string;
}

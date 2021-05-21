export interface IFile {
  name: string;
  creationDate: Date;
  path: string;
  size: number;
  sha256: string;
}

export interface ISyncFile extends IFile {
  sync: 'synchronized' | 'unsynchronized' | null;
}

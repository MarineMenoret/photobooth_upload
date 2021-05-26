export interface IDirectoryTree {
  name: string;
  children?: Array<IDirectoryTree>;
  path?: string;
}

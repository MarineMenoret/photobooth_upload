import {IDirectoryTree} from "./directory-tree";
import {IFile, ISyncFile} from "./file";

export interface IProject {
  name: string;
  creationDate: Date;
  directoryTree: IDirectoryTree;
  files: Array<IFile>;
}

export interface ISyncProject extends Omit<IProject, 'files'> {
  sync: 'synchronized' | 'unsynchronized' | null;
  files: Array<ISyncFile>
}

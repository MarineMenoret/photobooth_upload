import {IDirectoryTree} from "./directory-tree";
import {IFile, ISyncFile} from "./file";

export type SyncState = 'cloud' | 'local' | 'synchronized' | 'unsynchronized' | 'isSynchronizing';

export interface IProject {
  name: string;
  creationDate: Date;
  directoryTree: IDirectoryTree;
  files: Array<IFile>;
}

export interface ISyncProject extends Omit<IProject, 'files'> {
  sync: SyncState;
  files: Array<ISyncFile>
}

import {IDirectoryTree} from "./directory-tree";
import {IFile, ISyncFile} from "./file";
import firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;

export type SyncState = 'cloud' | 'local' | 'synchronized' | 'unsynchronized' | 'isSynchronizing';

export interface IProject {
  name: string;
  creationDate: Timestamp;
  directoryTree: IDirectoryTree;
  files: Array<IFile>;
}

export interface ISyncProject extends Omit<IProject, 'files'> {
  sync: SyncState;
  files: Array<ISyncFile>
}

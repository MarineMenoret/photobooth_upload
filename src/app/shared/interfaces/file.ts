import {SyncState} from "./project";
import firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;

export interface IFile {
  name: string;
  creationDate: Timestamp;
  path: string;
  size: number;
  sha256: string;
}

export interface ISyncFile extends IFile {
  sync: SyncState;
}

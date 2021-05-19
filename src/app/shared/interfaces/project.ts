import {IDirectoryTree} from "./directory-tree";
import {IFile} from "./file";

export interface IProject {
  name: string;
  creationDate: Date;
  directoryTree: IDirectoryTree;
  files: Array<IFile>;
}

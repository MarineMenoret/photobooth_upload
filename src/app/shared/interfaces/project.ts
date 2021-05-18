import { IFile } from "./file";

export interface IProject {
    name: string;
    creationDate: Date;
    directoryTree: any;
    files: Array<IFile>;
}
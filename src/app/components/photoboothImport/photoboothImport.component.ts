import {Component} from "@angular/core";
import {IDirectoryTree} from "../../shared/interfaces/directory-tree";
import {IProject} from "../../shared/interfaces/project";

const ELEMENT_DATA: IProject[] = [
  { name: 'Project 1', creationDate: new Date(), directoryTree: {} as IDirectoryTree, files: [] },
  { name: 'Project 2', creationDate: new Date(), directoryTree: {} as IDirectoryTree, files: [] },
  { name: 'Project 2', creationDate: new Date(), directoryTree: {} as IDirectoryTree, files: [] },
];

@Component({
  selector: "photoboothImport",
  templateUrl: "./photoboothImport.component.html",
  styleUrls: ["./photoboothImport.component.scss"],
})
export class PhotoboothImportComponent {
  displayedColumns: string[] = ['project', 'creation date', 'state'];
  dataSource = ELEMENT_DATA;
}

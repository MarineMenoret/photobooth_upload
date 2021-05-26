import {Injectable} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from "@angular/fire/firestore";
import {IProject} from "../../shared/interfaces/project";
import {Subject} from "rxjs";
import firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;
import {ElectronService} from "../../core/services";
import {DirectoryTreeService} from "../directory-tree/directory-tree.service";

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  projectsCollection: AngularFirestoreCollection<IProject>;
  remoteProjects$: Subject<Array<IProject>>;
  localProjects$: Subject<Array<IProject>>;

  constructor(private afs: AngularFirestore,
              private electronService: ElectronService,
              private directoryTreeService: DirectoryTreeService) {
    this.projectsCollection = this.afs.collection<IProject>('projects');
    this.remoteProjects$ = new Subject<Array<IProject>>();
    this.localProjects$ = new Subject<Array<IProject>>();
  }

  getRemoteProjects(): void {
    const projects = new Array<IProject>();
    const projectsSubscription = this.projectsCollection.get()
      .subscribe(
        (querySnapshot) => {
          querySnapshot.forEach((doc) => {
            const project: IProject = {
              name: doc.data().name,
              creationDate: (doc.data().creationDate as unknown as Timestamp).toDate(),
              directoryTree: doc.data().directoryTree,
              files: doc.data().files.map(file => {
                return {
                  ...file,
                  creationDate: (file.creationDate as unknown as Timestamp).toDate()
                };
              }),
            };
            // Convert Timestamp to Date.
            projects.push(project);
          });
          this.remoteProjects$.next(projects);
        },
        (error) => {
          console.log(error);
        },
        () => {
          console.log('The list of remote projects downloaded successfully.');
          projectsSubscription.unsubscribe();
        }
      );
  }

  async getLocalProjects(directoryPath: string): Promise<void> {
    const projects = new Array<IProject>();

    const directoryChildren = this.electronService.fs.readdirSync(directoryPath);

    for (const child of directoryChildren) {
      const childPath = this.electronService.path.join(directoryPath, child);

      if (this.electronService.fs.lstatSync(childPath).isDirectory()) {
        this.directoryTreeService.initialize();

        const project: IProject = {
          name: child,
          creationDate: this.electronService.fs.lstatSync(childPath).birthtime,
          directoryTree: await this.directoryTreeService.buildTree(childPath),
          files: this.directoryTreeService.getFiles().map(file => {
            const pathSegments = file.path.split(this.electronService.path.sep);
            const relativePathSegments = pathSegments.slice(pathSegments.indexOf(child));
            const localRelativePath = this.electronService.path.join(...relativePathSegments);
            return {
              ...file,
              path: localRelativePath
            };
          })
        };

        projects.push(project);
      }
    }

    this.localProjects$.next(projects);
  }
}

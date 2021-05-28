import {Injectable} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from "@angular/fire/firestore";
import {IProject} from "../../shared/interfaces/project";
import {Subject} from "rxjs";
import firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;
import {ElectronService} from "../../core/services";
import {DirectoryTreeService} from "../directory-tree/directory-tree.service";
import {AngularFireStorage} from "@angular/fire/storage";
import TaskState = firebase.storage.TaskState;
import {IDirectoryTree} from "../../shared/interfaces/directory-tree";
import {IFile} from "../../shared/interfaces/file";

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  projectsCollection: AngularFirestoreCollection<IProject>;
  remoteProjects$: Subject<Array<IProject>>;
  localProjects$: Subject<Array<IProject>>;

  constructor(private afs: AngularFirestore,
              private storage: AngularFireStorage,
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

  uploadFile(projectsDirectory: string, file: IFile): Promise<void> {
    const fullPath = this.electronService.path.join(projectsDirectory, file.path);

    return new Promise<void>((resolve, reject) => {
      this.electronService.fs.readFile(fullPath, (error, data) => {
        if (error) {
          reject(error);
        } else {
          this.updateProjectStructure(file)
            .then(() => {
              this.storage.upload(file.path, data)
                .then(uploadTaskSnapShot => {
                  switch (uploadTaskSnapShot.state) {
                    case TaskState.SUCCESS:
                      resolve();
                      break;
                    case TaskState.CANCELED:
                      reject(new Error('File upload canceled!'));
                      break;
                    case TaskState.ERROR:
                      reject(new Error('File upload failed!'));
                      break;
                  }
                })
                .catch((error) => reject(error));
            })
            .catch(error => reject(error));
        }
      });
    });
  }

  updateProjectStructure(file: IFile): Promise<void> {
    const pathSegments = file.path.split(this.electronService.path.sep);
    const projectName = pathSegments[0];
    return new Promise<void>((resolve, reject) => {
      this.projectsCollection.ref.where('name', '==', projectName).get()
        .then((querySnapshot) => {
          if (querySnapshot.empty) {
            // TODO create a new project
          } else if (querySnapshot.size == 1) {
            const updatedDirectoryTree = querySnapshot.docs[0].data().directoryTree;
            this.updateDirectoryTree(updatedDirectoryTree, pathSegments, file.path);

            const updatedFiles = querySnapshot.docs[0].data().files;
            updatedFiles.push(file);

            querySnapshot.docs[0].ref.update(
              {
                directoryTree: updatedDirectoryTree,
                files: updatedFiles
              })
              .then(() => {
                console.log('The project structure has been successfully updated!');
                resolve();
              })
              .catch(error => reject(error));
          } else {
            reject(new Error('Several projects with the same name were found!'));
          }
        })
        .catch(error => reject(error));
    });
  }

  updateDirectoryTree(directoryTree: IDirectoryTree, pathSegments: Array<string>, filePath: string): void {
    pathSegments = pathSegments.slice(1);

    if (pathSegments.length == 1) {
      directoryTree.children
        ? directoryTree.children.push({name: pathSegments[0], path: filePath})
        : directoryTree.children = new Array<IDirectoryTree>({name: pathSegments[0], path: filePath});
    } else if (pathSegments.length > 1) {
      const childDirectoryIndex = directoryTree.children?.findIndex(child => child.name == pathSegments[0]);

      if (childDirectoryIndex == undefined) {
        directoryTree.children = new Array<IDirectoryTree>({name: pathSegments[0]});
        this.updateDirectoryTree(directoryTree.children[directoryTree.children.length - 1], pathSegments, filePath);
      } else if (childDirectoryIndex == -1) {
        directoryTree.children.push({name: pathSegments[0],});
        this.updateDirectoryTree(directoryTree.children[directoryTree.children.length - 1], pathSegments, filePath);
      } else {
        this.updateDirectoryTree(directoryTree.children[childDirectoryIndex], pathSegments, filePath);
      }
    }
  }
}

import {Injectable} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection, DocumentReference} from "@angular/fire/firestore";
import {IProject, ISyncProject} from "../../shared/interfaces/project";
import {Subject} from "rxjs";
import firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;
import {ElectronService} from "../../core/services";
import {DirectoryTreeService} from "../directory-tree/directory-tree.service";
import {AngularFireStorage} from "@angular/fire/storage";
import TaskState = firebase.storage.TaskState;
import {IDirectoryTree} from "../../shared/interfaces/directory-tree";
import {IFile, ISyncFile} from "../../shared/interfaces/file";
import Reference = firebase.storage.Reference;

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
        this.directoryTreeService.directory = child;

        const project: IProject = {
          name: child,
          creationDate: this.electronService.fs.lstatSync(childPath).birthtime,
          directoryTree: this.directoryTreeService.buildRelativeTree(await this.directoryTreeService.buildTree(childPath)),
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
          this.updateProjectStructure(projectsDirectory, file)
            .then(() => {
              this.storage.upload(file.path, data)
                .then(uploadTaskSnapShot => {
                  switch (uploadTaskSnapShot.state) {
                    case TaskState.SUCCESS:
                      resolve();
                      break;
                    case TaskState.ERROR:
                      reject(new Error(`The upload of the file "${file.name}" failed!`));
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

  updateProjectStructure(projectsDirectory: string, file: IFile): Promise<void> {
    const pathSegments = file.path.split(this.electronService.path.sep);
    const projectName = pathSegments[0];
    return new Promise<void>((resolve, reject) => {
      this.projectsCollection.ref.where('name', '==', projectName).get()
        .then((querySnapshot) => {
          if (querySnapshot.empty) {
            reject(new Error('Project not found!'));
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

  uploadProject(projectsDirectory: string, project: ISyncProject): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.saveProjectStructure(project)
        .then(async projectRef => {
          console.log(`Project structure has been successfully saved with ID: ${projectRef.id}`);
          const uploadedFilesRef = new Array<Reference>();

          for (const file of project.files) {
            const fullPath = this.electronService.path.join(projectsDirectory, file.path);
            let data: Buffer;

            // Reading project files
            try {
              data = this.electronService.fs.readFileSync(fullPath);
            } catch (error) {
              // If an error occurred while reading the project files, restore the database to its original state and exit from the for loop.
              await projectRef.delete();
              for (const fileRef of uploadedFilesRef) {
                await fileRef.delete();
              }
              reject(error);
              break;
            }

            // Uploading project files
            if (data) {
              try {
                const uploadTaskSnapShot = await this.storage.upload(file.path, data);
                switch (uploadTaskSnapShot.state) {
                  case TaskState.SUCCESS:
                    uploadedFilesRef.push(uploadTaskSnapShot.ref);
                    break;
                  case TaskState.ERROR:
                    await Promise.reject(new Error(`The upload of the file "${file.name}" failed!`));
                    break;
                }
              } catch (error) {
                // If an error occurred while uploading the project files, restore the database to its original state and exit from the for loop.
                await projectRef.delete();
                for (const fileRef of uploadedFilesRef) {
                  await fileRef.delete();
                }
                reject(error);
                break;
              }
            }
          }

          if (uploadedFilesRef.length == project.files.length) {
            resolve();
          } else {
            reject(new Error('Some files were not uploaded correctly!'));
          }
        })
        .catch(error => reject(error));
    });
  }

  saveProjectStructure(project: ISyncProject): Promise<DocumentReference<IProject>> {
    const projectToSave: IProject = {
      name: project.name,
      creationDate: project.creationDate,
      directoryTree: project.directoryTree,
      files: project.files.map(syncFile => {
        return {
          name: syncFile.name,
          creationDate: syncFile.creationDate,
          path: syncFile.path,
          sha256: syncFile.sha256,
          size: syncFile.size
        };
      })
    };
    return this.projectsCollection.add(projectToSave);
  }

  downloadProject(project: ISyncProject): void {
    this.storage.ref(project.name).listAll().toPromise()
      .then((result) => {
        // TODO complete this function
        console.log(result.items);
        console.log(result.prefixes);
      })
      .catch(error => console.log(error));
  }

  downloadFile(projectsDirectory: string, file: ISyncFile): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.storage.ref(file.path).getDownloadURL().toPromise()
        .then((url) => {
          const fileFullPath = this.electronService.path.join(projectsDirectory, file.path);
          const fileDirectory = this.electronService.path.dirname(fileFullPath);

          // Create a folder recursively if it does not exist..
          try {
            if (!this.electronService.fs.existsSync(fileDirectory)) {
              this.electronService.fs.mkdirSync(fileDirectory, {recursive: true});
            }
          } catch (error) {
            reject(error);
            return;
          }

          const req = this.electronService.request({
            method: 'GET',
            uri: url
          });

          const out = this.electronService.fs.createWriteStream(fileFullPath);
          req.pipe(out);

          req.on('end', () => {
            resolve();
            console.log(`"${file.name}" file successfully downloaded`);
          });

          req.on('error', (error) => reject(error));
        })
        .catch(error => reject(error));
    });
  }
}

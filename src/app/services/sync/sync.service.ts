import {Injectable} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from "@angular/fire/firestore";
import {IProject, ISyncProject} from "../../shared/interfaces/project";
import {Subject} from "rxjs";
import firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  projectsCollection: AngularFirestoreCollection<IProject>;
  remoteProjects$: Subject<Array<ISyncProject>>;

  constructor(private afs: AngularFirestore) {
    this.projectsCollection = this.afs.collection<IProject>('projects');
    this.remoteProjects$ = new Subject<Array<ISyncProject>>();
  }

  getRemoteProjects(): void {
    const projects = new Array<ISyncProject>();
    const projectsSubscription = this.projectsCollection.get()
      .subscribe(
        (querySnapshot) => {
          querySnapshot.forEach((doc) => {
            const project: ISyncProject = {
              name: doc.data().name,
              creationDate: (doc.data().creationDate as unknown as Timestamp).toDate(),
              directoryTree: doc.data().directoryTree,
              files: doc.data().files.map(file => {
                return {
                  ...file,
                  creationDate: (file.creationDate as unknown as Timestamp).toDate(),
                  sync: null
                };
              }),
              sync: null,
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
}

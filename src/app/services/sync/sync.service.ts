import {Injectable} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from "@angular/fire/firestore";
import {IProject} from "../../shared/interfaces/project";
import {Subject} from "rxjs";
import firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  projectsCollection: AngularFirestoreCollection<IProject>;
  remoteProjects$: Subject<Array<IProject>>;

  constructor(private afs: AngularFirestore) {
    this.projectsCollection = this.afs.collection<IProject>('projects');
    this.remoteProjects$ = new Subject<Array<IProject>>();
  }

  getRemoteProjects(): void {
    const projects = new Array<IProject>();
    const projectsSubscription = this.projectsCollection.get()
      .subscribe(
        (querySnapshot) => {
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Convert Timestamp to Date.
            data.creationDate = (data.creationDate as unknown as Timestamp).toDate();
            data.files.forEach(file => file.creationDate = (file.creationDate as unknown as Timestamp).toDate());
            projects.push(data);
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

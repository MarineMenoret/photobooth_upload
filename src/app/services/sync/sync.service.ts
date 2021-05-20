import {Injectable} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from "@angular/fire/firestore";
import {IProject} from "../../shared/interfaces/project";
import {Subject} from "rxjs";

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
            projects.push(doc.data());
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

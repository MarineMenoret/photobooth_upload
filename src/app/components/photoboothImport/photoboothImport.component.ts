import {Component, OnDestroy, OnInit} from "@angular/core";
import {IProject} from "../../shared/interfaces/project";
import {SyncService} from "../../services/sync/sync.service";
import {Subscription} from "rxjs";

@Component({
  selector: "photoboothImport",
  templateUrl: "./photoboothImport.component.html",
  styleUrls: ["./photoboothImport.component.scss"],
})
export class PhotoboothImportComponent implements OnInit, OnDestroy {
  subscriptions: Array<Subscription>;
  displayedColumns: Array<string>;
  remoteProjects: Array<IProject>;

  constructor(private syncService: SyncService) {
  }

  ngOnInit(): void {
    this.initialize();
  }

  initialize(): void {
    this.subscriptions = new Array<Subscription>();
    this.displayedColumns = ['project', 'creation date', 'state'];
    this.remoteProjects =  new Array<IProject>();

    this.subscriptions.push(
      this.syncService.remoteProjects$.subscribe((projects) => {
        this.remoteProjects = projects;
      })
    );
  }

  getRemoteProjects(): void {
    this.syncService.getRemoteProjects();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}

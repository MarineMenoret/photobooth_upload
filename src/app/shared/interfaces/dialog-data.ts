export interface DialogData {
  title: string;
  content: string;
  action: 'Download' | 'Upload' | 'Synchronize';
  conflictingFiles?: Array<string>
}

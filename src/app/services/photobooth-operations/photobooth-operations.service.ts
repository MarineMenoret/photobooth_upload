import { Injectable } from "@angular/core";
import { ElectronService } from "../../core/services/electron/electron.service";
import { ExperimentData } from "./experiment-data";


/*FOR DEV*/
import { DevExperimentalDesign } from "./dev-experimental-design"

@Injectable({
  providedIn: "root",
})
export class PhotoboothOperationsService {

  swagger: any;
  request: any;
  api: any;
  auth_token: any;
  hostname: string;
  fs: any;
  path: any;
  dirTree: any;
  csv: any;
  equipment_file_description_id_directory = ExperimentData.equipment_file_description_id_directory;
  stimuli_filename_to_stimuli_token = ExperimentData.stimuli_filename_to_stimuli_token;
  experimental_designs: object = DevExperimentalDesign.experimental_designs;

  constructor(
    private electronService: ElectronService,
  ) {
    this.swagger = this.electronService.swagger;
    this.request = this.electronService.request;
    this.fs = electronService.fs;
    this.path = electronService.path;
    this.dirTree = electronService.dirTree;
    this.csv = this.electronService.csv;
  }

  isNull(payload) {
    return (payload == null)
  };

  /**
   * Connect to photobooth + get swagger api
   * @param hostname 
   * @param email 
   * @param password 
   */
  async connect(hostname, email, password) {
    this.hostname = hostname;
    try {
      let jwt: any = await this.callJsonRequest('/authentication', {
        "strategy": "local",
        "email": email,
        "password": password
      });
      this.auth_token = jwt.accessToken;
      console.log("JWT Granted : ", this.auth_token)
      let options = {
        authorizations: {
          "bearerAuth": this.auth_token
        }
      };
      let client = await this.swagger(hostname + '/swagger.json', options);
      this.api = client.apis;
      if (this.auth_token !== undefined) return true;
      else throw ("401 Invalid login information");
    } catch (e) {
      console.log("[ERROR] Photobooth Authentication failed: ", e);
      return false;
    }

  };

  async callApi(tag, operation, parameters = null, payload = null) {
    payload = !this.isNull(payload) ? {
      requestBody: payload
    } : undefined;
    let result = await this.api[tag][operation](parameters, payload);
    return result.obj;
  };


  async callJsonRequest(endpoint, json) {
    return new Promise((resolve, reject) => {
      let path = this.hostname + endpoint;
      this.request.post({
        url: path,
        json: json,
        headers: {
          'Connection': 'keep-alive'
        }
      }, function (err, httpResponse, body) {
        if (err) {
          reject(err);
        }
        console.log("JSON Raw request reponse :", body)
        resolve(body);
      });
    });
  };

  async callRequest(endpoint, formdata) {
    return new Promise((resolve, reject) => {
      let path = this.hostname + endpoint;
      let authStr = 'Bearer ' + this.auth_token;
      this.request.post({
        url: path,
        headers: {
          'Authorization': authStr,
          'Connection': 'keep-alive'
        },
        formData: formdata,
      },
        function (err, httpResponse, body) {
          if (err) {
            console.error("RAW Request response error : ", err)
            console.log("resending")
            //await callRequest(endpoint,formdata)
            reject(err);
          }
          console.log("Raw request reponse :", body)
          resolve(body);
        });
    });
  }

  /**
   * Create a new project in photobooth with a given experimental design 
   * available in local project directory
   * @param projectPath : local project directory path
   */
  async createProject(projectPath, events) {
    try {
      const tree = this.electronService.dirTree(projectPath);

      //get experimental design :
      console.log("WORKING ON PROJECT ", this.experimental_designs["name"]);
      let name = this.experimental_designs["name"];
      let signal_types = this.experimental_designs["signal_types"];
      // let events = this.experimental_designs["events"]; //remplacé par events passé en paramètre
      let number_of_sessions = this.experimental_designs["number_of_sessions"];
      let start_date = this.experimental_designs["start_date"];
      let end_date = this.experimental_designs["end_date"];
      let conditions = this.experimental_designs["conditions"];
      let transformations = this.experimental_designs["transformations"];
      let anchorFileDescriptionId = 5 // We start with observerXT if no anchor specified
      if (this.experimental_designs["anchor"])
        anchorFileDescriptionId = this.experimental_designs["anchor"];

      // let equipment_file_description_ids = new Set();

      //Create project :
      let project;
      try {
        project = await this.callApi('Projects', 'createProject', null, {
          "name": name,
          "description": "Imported Project",
          "participations": 0,
          "teams": 0,
          "total_participants": 0,
          "start_date": start_date,
          "end_date": end_date,
          "template_locked": false
        });
        await this.callApi('Projects', 'updateProject', { id: project.id }, {
          "name": name,
          "description": "Imported Project",
          "participations": 0,
          "teams": 0,
          "total_participants": number_of_sessions,
          "start_date": start_date,
          "end_date": end_date,
          "template_locked": false
        });
        console.log("STATUS ", "PROJECT CREATED");
      } catch (e) {
        console.log("[ERROR] Project creation failed: ", e)
      }

      if (signal_types) await this.associateProjectSignals(signal_types, project.id);
      else throw ("[ERROR] Missing signal_types.")


      await this.associateProjectEvents(events, project.id);

      if (transformations) await this.associateProjectTransformations(transformations, project.id)

      await this.associateProjectStimuli(tree, name, project.id)
      await this.associateProjectConditions(conditions, number_of_sessions, project.id);

      //Lock project :
      try {
        await this.callApi('Projects', 'patchProject', {
          id: project.id
        }, { "template_locked": true });
        return true; // return true if project create, all associations made and project locked successfuly.
      } catch (e) {
        console.log("[ERROR] Failed to lock project.")
      }
    } catch (e) {
      console.log(e);
      return false;
    }

  }

  /**
   * Associate signal data to the created project
   * @param signal_types 
   * @param projectId 
   */
  async associateProjectSignals(signal_types, projectId) {
    for (let signal_type of signal_types) {
      let associateProjectSignals_data = {
        "dimensions": signal_type.dimension_types_ids,
        "signal_id": signal_type.id,
        "equipment_id": signal_type.equipment_type_id,
        "hardware_id": signal_type.equipment_hardware_id,
        "software_id": signal_type.equipment_software_id,
        "version_id": signal_type.equipment_software_version_id
      }
      console.log("STATUS", "CALLING associateProjectSignals", "Project id : ", projectId, "Data :", associateProjectSignals_data)

      try {
        await this.callApi('Projects', 'associateProjectSignals', {
          projectId: projectId
        }, associateProjectSignals_data)
        // equipment_file_description_ids.add(signal_type.equipment_file_description_id);
        console.log("STATUS ", "SIGNAL CREATED, ABSTRACT_TYPE : ", signal_type.id);
      } catch (e) {
        console.log("[ERROR] Project signals association failed: ", e);
      }
    }
  }

  /**
   * Associate events data to the created project
   * @param events 
   * @param projectId 
   */
  async associateProjectEvents(events, projectId) {
    console.log("events :", events);
    for (let event of events) {
      let eventName = "";
      if (event.name !== undefined) {
        eventName = event.name;
      } else {
        const regex = /_start/i;
        console.log("regex.test(event.start_marker) : ", regex.test(event.start_marker))
        if(regex.test(event.start_marker)){
          eventName = event.start_marker.replace(regex, '');
        }else{
          eventName = event.start_marker;
        }
      }

      console.log("eventName: ", eventName);

      let eventDB;
      try {
        eventDB = await this.callApi('Events', 'createEvent', {
          projectId: projectId
        }, {
          "name": eventName,
          "start_marker": event.start_marker,
          "end_marker": event.end_marker,
          "software_id": event.equipment_software_id,
          "version_id": event.equipment_software_version_id,
          "time": 1538686663567
        })
      } catch (e) {
        console.log("[ERROR] Project event creation failed: ", e);
      }
      try{
        await this.callApi('Projects', 'associateProjectEvents', {
          projectId: projectId
        }, {
          "id": eventDB.id,
          "software_id": event.equipment_software_id,
          "version_id": event.equipment_software_version_id
        })
        console.log("STATUS ", "EVENT CREATED, START_MARKER : ", event.start_marker, " equipment_software_version_id : ", event.equipment_software_version_id, "eventName: ", eventName);
        // equipment_file_description_ids.add(event.equipment_file_description_id);
      } catch (e) {
        console.log("[ERROR] Project events association failed: ", e);
      }
    }
  }

  /**
   * Associate transformations data to the created project
   * @param transformations 
   * @param projectId 
   */
  async associateProjectTransformations(transformations, projectId) {
    for (let transformationId of transformations) {
      try {
        await this.callApi('Projects', 'associateProjectTransformations', {
          projectId: projectId
        }, {
          transformation_id: transformationId
        })
      } catch (e) {
        console.log("[ERROR] Project transformation association failed: ", e);
      }
    }
  }

  /**
   * Associate stimuli data to the created project
   * @param tree 
   * @param name 
   * @param projectId 
   */
  async associateProjectStimuli(tree, name, projectId) {
    let currentProjectNode;
    for (let project_node of tree.children) {
      if (project_node.name == name) {
        currentProjectNode = project_node;
        let image_node = this.findImageNode(project_node);
        for (let image of image_node.children) {
          let stimuli_file_name = image.name;
          if (stimuli_file_name != 'Thumbs.db') {
            let stimuli_token = this.stimuli_filename_to_stimuli_token[stimuli_file_name];
            if (!stimuli_token) {
              console.log("Warning! : COUDLNT FIND STIMULI TOKEN, USING STIMULI FILE NAME AS TOKEN", stimuli_file_name)
              stimuli_token = stimuli_file_name;
            }

            let stimuli_file_path = this.electronService.path.normalize(image.path);
            console.log("Stimuli Image Path : ", stimuli_file_path)
            var dimensions = this.electronService.sizeOf(stimuli_file_path);

            var data = {
              width: dimensions.width,
              height: dimensions.height,
              resolution_width: 1920,
              resolution_heigh: 1080,
              file_extension: this.electronService.path.extname(stimuli_file_path),
              name: stimuli_token,
              description: stimuli_token,
              start_marker: this.electronService.uuidv4(),
              end_marker: this.electronService.uuidv4(),
              file: this.electronService.fs.createReadStream(stimuli_file_path)
            };
            let stimuli: any;
            try {
              stimuli = await this.callRequest('/stimuli/', data);
              console.log("Created Stimuli:", stimuli)
              await this.callApi('Projects', 'associateProjectStimuli', {
                projectId: projectId
              }, {
                "id": JSON.parse(stimuli).id,
                "software_id": 13,
                "version_id": 1,
              })
              console.log("STATUS ", "STIMULI CREATED, TOKEN : ", stimuli_file_name);
            } catch (e) {
              console.log("[ERROR] Project stimuli association failed: ", e);
            }
          }
        }
      }
    }
  }

  /**
   * Associate conditions data to the created project
   * @param conditions 
   * @param number_of_sessions 
   * @param projectId 
   */
  async associateProjectConditions(conditions, number_of_sessions, projectId) {
    try {
      let condition = await this.callApi('Conditions', 'createCondition', null, {
        "name": conditions[0].name,
        "nbr_participations": number_of_sessions,
      })

      await this.callApi('Projects', 'associateProjectConditions', {
        projectId: projectId
      }, { id: condition.id })

      console.log("STATUS ", "CONDITION CREATED");
    } catch (e) {
      console.log("[ERROR] Project conditions association failed: ", e);
    }

  }

  /**
   * Import data from a local project directory into existing photobooth project
   * @param projectId 
   * @param isUploadFiles
   * @param equipment_file_description_ids 
   * @param projectsDataPath 
   * @param operationDelay 
   * @param projectName 
   * @param anchorFileDescriptionId 
   */
  async importData(projectId, isUploadFiles, equipment_file_description_ids, projectsDataPath, operationDelay, projectName, anchorFileDescriptionId) {
    let participantsEmails = [];
    let tree = this.dirTree(projectsDataPath);
    let numberOfAllSessions = 0;
    let participantsNames = [];

    /* Get basic data from selected project directory: */
    for (let project_node_directory of tree.children) {
      if (project_node_directory.name == projectName) {
        numberOfAllSessions = this.findNumberOfParticipant(project_node_directory);
        participantsNames = this.findParticipantsName(project_node_directory);
        let metaDataNode = this.findMetaDataNode(project_node_directory);
        let emails = await this.findEmailsData(metaDataNode);
        if (emails) {
          participantsEmails = emails;
        }
      }
    }

    /* determine if participant was present: */
    console.log("numberOfAllSessions :", numberOfAllSessions);
    for (let i = 0; i < numberOfAllSessions; i++) {
      let participantName = this.buildParticipantName(i);
      let status = "valid";
      let participantPresent = true;

      if (!participantsNames.includes(participantName)) {
        status = 'noShow'
        participantPresent = false;
      }

      /* Create session: */
      let session;
      try {
        session = await this.callApi('Sessions', 'createSession', null, {
          "name": "Session " + i,
          "booking_start_time": 0,
          "booking_end_time": 1,
          "start_time": 0,
          "end_time": 1,
          "pretest": 0,
          "project_id": projectId
        });
      } catch (e) {
        console.log(e);
      }

      /* Create participant: */
      let participantId = 1;
      let participantEmail = '';
      if (participantsEmails) {
        if (participantsEmails.length) {
          console.log("INFO ", "[Looking if email available for participant]")
          for (let pmail of participantsEmails) {
            if (pmail.email != "" && pmail.p == participantName) {
              participantEmail = pmail.email;
              console.log("INFO ", "Found Email for participant ", participantEmail)
            }
          }
        }
        else {
          console.log("INFO ", "[No emails found for participants]")
        }
      }

      // Check if participant already exist in DB and if existing, change it's participantId:
      let participantRaw = null;
      let participantRawData = [];
      if (participantEmail != '') {
        try {
          participantRaw = await this.callApi('Participants', 'getParticipants', { "email": participantEmail });
          participantRawData = participantRaw.data;
        } catch (e) {
          console.log("[ERROR] Get participants failed: ", e);

        }
      }
      if (participantRawData.length) {
        console.log("INFO ", "[Found existing participant (id):]", participantRawData[0].id)
        participantId = participantRawData[0].id;
      } else if (participantRawData.length == 0 && participantEmail != '') {
        try {
          await this.callApi('Participants', 'createParticipant', null, {
            "email": participantEmail,
            "sex": "F",
            "birthyear": "2019",
            "language": "fr"
          });
          participantRaw = await this.callApi('Participants', 'getParticipants', { "email": participantEmail });
          participantRawData = participantRaw.data;
          console.log("INFO ", "[New participant created (id):]", participantRawData[0].id)
          participantId = participantRawData[0].id;
        } catch (e) {
          console.log("[ERROR] Participant creation failed: ", e);
        }
      }

      /* Update session: */
      try {
        session = await this.callApi('Sessions', 'updateSession', {
          id: session.id
        }, {
          "id": 0,
          "name": "Session " + i,
          "booking_start_time": 0,
          "booking_end_time": 1,
          "start_time": 0,
          "end_time": 1,
          "pretest": 0,
          "project_id": projectId,
          "participant_id": participantId,
          "status": status
        });
        console.log("STATUS ", "PARTICIPATION CREATED n# ", i + 1);
      } catch (e) {
        console.log("[ERROR] Session updating failed: ", e);

      }


      /* Upload files: */
      if (isUploadFiles) {
        console.log("UPLOADING FILES");
        for (let equipment_file_description_id of equipment_file_description_ids) {
          let folder_name = this.equipment_file_description_id_directory[equipment_file_description_id].toLowerCase();
          console.log("[Looking for foldername]: ", folder_name, " [FOR FILE_DESCRIPTION_ID] ", equipment_file_description_id)

          let tree = this.dirTree(projectsDataPath);
          for (let project_node of tree.children) {
            if (project_node.name == projectName) {
              let data_node = this.findDataNode(project_node);
              let session_node;
              for (let participantFolder of data_node.children) {
                if (participantFolder.name == participantName) {
                  session_node = participantFolder;
                }
              }

              if (participantPresent) {
                let folderFound = false;
                if (session_node != undefined) {
                  for (let software_node of session_node.children) {
                    if (software_node.name.toLowerCase() == folder_name) {
                      folderFound = true;
                      if (software_node.children[0] == undefined)
                        console.log('FILE NOT FOUND INSIDE THE FOLDER : ', software_node)
                      else {
                        let file_path = software_node.children[0].path;
                        console.log("DATA FILE PATH : ", file_path)
                        let file_extension = file_path.slice((file_path.lastIndexOf(".") - 1 >>> 0) + 2);
                        let file_name = software_node.children[0].name.replace(/[^a-zA-Z.\d:]/g, '');
                        console.log("ORIGINAL NAME:", software_node.children[0].name);
                        console.log("SAFE NAME:", file_name);
                        var data = {
                          file_extension: file_extension,
                          file_name: file_name,
                          file_description_id: equipment_file_description_id,
                          file: this.fs.createReadStream(this.path.normalize(file_path))
                        };
                        let uploaded = false;
                        while (!uploaded) {
                          try {
                            await this.callRequest('/participations/' + session.participations.id + '/upload', data);
                            uploaded = true;
                            console.log("UPLOAD SUCCESSFULL, reuploading in 1sec")
                          } catch (e) {
                            console.error("UPLOAD FAILED, reuploading in 1sec")
                            this.wait(1000);
                          }
                        }
                        console.log("STATUS ", "FILE UPLOADED NAME :", file_name, " SOFTWARE: ", folder_name);
                      }
                    }
                  }
                }
                if (!folderFound) {
                  console.log("SOFTWARE FOLDER NOT FOUND", folder_name, " equipment_file_description_id : ", equipment_file_description_id);
                }
              }
              else {
                console.log("Skipping participant", participantName)
              }
            }
          }
        }
      }
    }
    //After uploads
    if (isUploadFiles) {
      // await this.startOperations(projectId, operationDelay, this.photoboothOperationsService, anchorFileDescriptionId);
    }
  }

  findDataNode(project_node) {
    for (let child of project_node.children) {
      if (child.name.toLowerCase() == 'data')
        return child;
    }
    return null;
  }

  findNumberOfParticipant(projectDirectory) {
    let data_node = this.findDataNode(projectDirectory);
    let maximumParticipantIdFound = 0;
    if (data_node.children.length != 0) {
      for (let participationFolder of data_node.children) {
        let folderNumber = parseInt(participationFolder.name.substring(1));
        if (folderNumber > maximumParticipantIdFound) {
          maximumParticipantIdFound = folderNumber;
        }
      }
    }
    if (maximumParticipantIdFound) {
      return maximumParticipantIdFound;
    }
    return -1;
  }

  findParticipantsName(projectDirectory) {
    let data_node = this.findDataNode(projectDirectory);
    let participantsNames = [];
    for (let participationFolder of data_node.children) {
      participantsNames.push(participationFolder.name);
    }
    return participantsNames;
  }

  buildParticipantName(participantIndex) {
    let name = "p";
    if (participantIndex < 9)
      name += '0'
    let number = participantIndex + 1;
    name += number.toString();
    return name;
  }

  findImageNode(project_node) {
    for (let child of project_node.children) {
      if (child.name.toLowerCase() == 'images' || child.name.toLowerCase() == 'image')
        return child;
    }
    return null;
  }

  async findEmailsData(metaDataNode) {
    let emails = null;
    if (metaDataNode) {
      for (let child of metaDataNode.children) {
        if (child.name.toLowerCase() == 'emails.csv' || child.name.toLowerCase() == 'email.csv' || child.name.toLowerCase() == 'courriel.csv' || child.name.toLowerCase() == 'courriels.csv')
          emails = await this.readCSVsync(child.path)
      }
    }
    return emails;
  }

  findMetaDataNode(project_node) {
    for (let child of project_node.children) {
      if (child.name.toLowerCase() == 'metadata' || child.name.toLowerCase() == 'meta')
        return child;
    }
    return null;
  }

  async readCSVsync(path) {
    return new Promise((resolve, reject) => {
      this.fs.readFile(path, 'utf8', function (err, rawData) {
        if (err) reject(err);
        let rawDataWithHeader = "p\temail\n" + rawData;

        this.csv.parse(rawDataWithHeader, { delimiter: '\t', columns: true }, function (err, data) {
          for (let i = 0; i < data.length; i++) {
            // console.log(data[i].email);
            if (data[i].email == "\n" || data[i].email == "\r")
              data[i].email = "";
          }
          console.log((data));
          resolve(data);
        })
      });
    });
  }

  async wait(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  async startOperations(projectId, operationDelay, api, anchorFileDescriptionId) {
    console.log("PROCESSING");
    let data_trees = await api.callApi('Projects', 'getProjectDataTrees', {
      projectId: projectId
    })
    console.log("data_trees :", data_trees);
    let project_types = await api.callApi('Projects', 'getProjectFileTypes', {
      projectId: projectId
    })
    console.log("project_types :", project_types);
    let data_acq_anchor_pulse = -1;
    for (let project_type of project_types.data) {
      if (project_type.id == anchorFileDescriptionId) {
        for (let sig of project_type.signals) {
          if (sig.id == 7) {
            data_acq_anchor_pulse = sig.data_acquisition_id;
          }
        }
      }
    }
    for (let data_tree of data_trees.data) {
      console.log("Starting New Tree");
      /// Find the anchor node and process it first
      for (let node of data_tree.data_tree_nodes) {
        if (node.data_acquisition_instance != null) {
          if (node.data_acquisition_instance.data_acquisition_id == data_acq_anchor_pulse) {
            console.log("Found anchor - Pulse Node");
            try {
              await api.callApi('NodeOperations', 'createNodeValidation', null, { data_tree_node_id: node.id })
            }
            catch (e) {
              console.error("OPERATIONS FAILED ON FOUND anchor PARSING NODE", { node_id: node.id, e })
            }
            console.log("Processed anchor - Pulse Waiting 10sec, node id : ", node.id);
            await this.wait(10000);
            console.log("Resuming");
          }
        }
      }
      for (let node of data_tree.data_tree_nodes) {
        if (node.data_acquisition_instance != null) {
          if (node.data_acquisition_instance.data_acquisition_id != data_acq_anchor_pulse) {
            if (node.data_tree_node_signal) {
              if (node.data_tree_node_signal.abstract_type_id == 7) {
                console.log("Found - Pulse Node - From other than anchor");
                try {
                  await api.callApi('NodeOperations', 'createNodeValidation', null, { data_tree_node_id: node.id })
                }
                catch (e) {
                  console.error("OPERATIONS FAILED ON PARSING NODE PULSE (from different source than anchor)", { node_id: node.id, e })
                }
                console.log("Processed PULSE - Pulse Waiting 10sec, node id : ", node.id);
                await this.wait(10000);
                console.log("Resuming");
              }
            }
          }
        }
      }
      for (let node of data_tree.data_tree_nodes) {
        if (node.data_acquisition_instance != null) {
          if (node.data_acquisition_instance.data_acquisition_id != data_acq_anchor_pulse) {
            let isSignal = false;
            if (node.data_tree_node_signal) {
              isSignal = true;
            }
            if (!isSignal || (isSignal && node.data_tree_node_signal.abstract_type_id != 7)) {
              try {
                await api.callApi('NodeOperations', 'createNodeValidation', null, {
                  data_tree_node_id: node.id
                })
              } catch (e) {
                console.error("VALIDATION FAILED", {
                  node_id: node.id,
                  e
                })
              }
              console.log("Processed node : ", node.id);
              console.log("Waiting for : ", operationDelay);
              await this.wait(operationDelay);
              console.log("Resuming");
            }
          }
        }
      }
    }
  }

}

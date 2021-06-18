export const DevExperimentalDesign = {
  experimental_designs: {
    name: "106_Gordon3",
    number_of_sessions: 19,
    start_date: 1522349203,
    end_date: 1522349204,
    conditions: [
      { name: "Condition A" }
    ],
    signal_types: [
      {
        id: 1, // Gaze
        dimension_types_ids: [106, 107, 108, 109, 110, 111, 112, 113, 114, 133],
        equipment_type_id: 2,
        equipment_hardware_id: 5,
        equipment_software_id: 13, // Tobii Studio
        equipment_software_version_id: 1,
        equipment_file_description_id: 1
      },
      {
        id: 2, // Pupil
        dimension_types_ids: [101],
        equipment_type_id: 2,
        equipment_hardware_id: 5,
        equipment_software_id: 13, // Tobii Studio
        equipment_software_version_id: 1,
        equipment_file_description_id: 1
      },
      {
        id: 5, // EDA
        dimension_types_ids: [118],
        equipment_type_id: 3,
        equipment_hardware_id: 4,
        equipment_software_id: 1, //AcqKnowledge
        equipment_software_version_id: 14,
        equipment_file_description_id: 8
      },
      {
        id: 3, // ECG
        dimension_types_ids: [116],
        equipment_type_id: 3,
        equipment_hardware_id: 3,
        equipment_software_id: 1, //AcqKnowledge
        equipment_software_version_id: 14,
        equipment_file_description_id: 8
      },
      {
        id: 8, // Emotion
        dimension_types_ids: [120, 121, 122, 123, 124, 125, 127,],
        equipment_type_id: 1,
        equipment_hardware_id: 17,
        equipment_software_id: 4,
        equipment_software_version_id: 4,
        equipment_file_description_id: 6
      },
      {
        id: 7, // Pulse
        dimension_types_ids: [132],
        equipment_type_id: 7,
        equipment_hardware_id: 2,
        equipment_software_id: 7,
        equipment_software_version_id: 8,
        equipment_file_description_id: 5
      }
    ],
    transformations: [
      1
    ],
    // events: [
    //   {
    //     start_marker: 'R_Virement_start',
    //     end_marker: 'R_Virement_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'R_TrouverFonctionVirement_start',
    //     end_marker: 'R_TrouverFonctionVirement_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'R_TrouverFonctionHistorique_Start',
    //     end_marker: 'R_TrouverFonctionHistorique_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'R_Reception_Start',
    //     end_marker: 'R_Reception_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'R_QuestionRBC_Start',
    //     end_marker: 'R_QuestionRBC_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'R_Historique_Start',
    //     end_marker: 'R_Historique_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'R_ConnexionReception_Start',
    //     end_marker: 'R_ConnexionReception_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'R_Connexion_Start',
    //     end_marker: 'R_Connexion_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'R_Confirmation_Start',
    //     end_marker: 'R_Confirmation_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'R_AjoutDestinataire_Start',
    //     end_marker: 'R_AjoutDestinataire_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'D_Virement_start',
    //     end_marker: 'D_Virement_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'D_TrouverFonctionVirement_start',
    //     end_marker: 'D_TrouverFonctionVirement_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'D_TrouverFonctionHistorique_Start',
    //     end_marker: 'D_TrouverFonctionHistorique_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'D_Reception_Start',
    //     end_marker: 'D_Reception_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'D_QuestionDesjardins_Start',
    //     end_marker: 'D_QuestionDesjardins_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'D_Historique_Start',
    //     end_marker: 'D_Historique_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'D_ConnexionReception_Start',
    //     end_marker: 'D_ConnexionReception_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'D_Connexion_Start',
    //     end_marker: 'D_Connexion_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'D_Confirmation_Start',
    //     end_marker: 'D_Confirmation_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'D_AjoutDestinataire_Start',
    //     end_marker: 'D_AjoutDestinataire_end',
    //     equipment_software_id: 13,
    //     equipment_software_version_id: 1, equipment_file_description_id: 1
    //   },
    //   {
    //     start_marker: 'Baseline',
    //     end_marker: 'Baseline',
    //     equipment_software_id: 7,
    //     equipment_software_version_id: 8, equipment_file_description_id: 5
    //   },
    //   {
    //     start_marker: 'A',
    //     end_marker: 'A',
    //     equipment_software_id: 7,
    //     equipment_software_version_id: 8, equipment_file_description_id: 5
    //   },
    //   {
    //     start_marker: 'B',
    //     end_marker: 'B',
    //     equipment_software_id: 7,
    //     equipment_software_version_id: 8, equipment_file_description_id: 5
    //   },
    // ]
  }
}
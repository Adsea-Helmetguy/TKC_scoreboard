export type ObsStatus = {
  recording: boolean;
  recordingPaused: boolean;
  streaming: boolean;
  replaybuffer: boolean;
  virtualcam: boolean;
};

export type ObsStudioApi = {
  getStatus: (callback: (status: ObsStatus) => void) => void;
};

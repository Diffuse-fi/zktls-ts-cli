import { LogType } from "./types";

export interface Options {
  method: string
  body?: string;
  headers?: { [key: string]: string };
  proofType?: string;
  paramValues?: { [key: string]: string };
}

export interface secretOptions {
  diffuseApiKey: string
}

export interface SendLogsParams {
    sessionId: string;
    logType: LogType;
    applicationId: string;
}


export interface Proof {
  proofType: string;
  zkProof: string;
  publicInput: string;
}

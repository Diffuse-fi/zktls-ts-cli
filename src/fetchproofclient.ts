import { createProofClaim } from "@diffusefi/fetch-proof-server";
import { HttpMethod, LogType } from "./types";
import { Options, secretOptions } from "./interfaces";
import {
  assertCorrectnessOfOptions,
  validateURL,
  sendLogs,
  validateApplicationIdAndSecret
} from "./utils";
import { v4 } from "uuid";
import P from "pino";
import { FetchError } from "./errors";
import { WITNESS_NODE_URL } from "./constants";
const logger = P();

export class DiffuseClient {
  applicationId: string;
  applicationSecret: string;
  logs?: boolean;
  sessionId: string;
  constructor(
    applicationId: string,
    applicationSecret: string,
    logs?: boolean
  ) {
    validateApplicationIdAndSecret(applicationId, applicationSecret);
    this.applicationId = applicationId;
    this.applicationSecret = applicationSecret;
    this.sessionId = v4().toString();
    // if the logs are enabled, set the logger level to info
    logger.level = logs ? "info" : "silent";
    logger.info(
      `Initializing client with applicationId: ${this.applicationId} and sessionId: ${this.sessionId}`
    );
  }

  async fetchProof(
    url: string,
    options?: Options,
    secretOptions?: secretOptions,
    retries = 1,
    retryInterval = 1000
  ) {
    validateURL(url, "fetchProof");
    if (options !== undefined) {
      assertCorrectnessOfOptions(options);
    }
    const fetchOptions = {
      method: options?.method || HttpMethod.GET,
      body: options?.body,
      headers: { ...options?.headers },
    };
    await sendLogs({
      sessionId: this.sessionId,
      logType: LogType.VERIFICATION_STARTED,
      applicationId: this.applicationId,
    });

    let attempt = 0;
    while (attempt < retries) {
      try {
        let fetchResponse = "";
        if (
          !secretOptions?.diffuseApiKey
        ) {
          const response = await fetch(url, fetchOptions);
          if (!response.ok) {
            throw new FetchError(
              `Failed to fetch ${url} with status ${response.status}`
            );
          }
          fetchResponse = await response.text();
        }
        const claim = await createProofClaim({
          name: "http",
          params: {
            method: fetchOptions.method as HttpMethod,
            url: url,
            responseMatches: secretOptions?.diffuseApiKey || [
              {
                type: "contains",
                value: fetchResponse,
              },
            ],
            headers: options?.headers,
            proofType: options?.proofType,
            body: fetchOptions.body || "",
            paramValues: options?.paramValues,
          },
          secretParams: {
            paramValues: secretOptions?.diffuseApiKey,
          },
          ownerPrivateKey: this.applicationSecret,
          logger: logger,
          client: {
            url: WITNESS_NODE_URL,
          },
        });
        if (claim.error) {
          throw new Error(`Failed to create claim on witness: ${claim.error.message}`);
        }

        await sendLogs({
          sessionId: this.sessionId,
          logType: LogType.PROOF_GENERATED,
          applicationId: this.applicationId,
        });
        return claim;
      } catch (error) {
        attempt++;
        if (attempt >= retries) {
          await sendLogs({
            sessionId: this.sessionId,
            logType: LogType.ERROR,
            applicationId: this.applicationId,
          });
          logger.error(error);
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    }
  }
}

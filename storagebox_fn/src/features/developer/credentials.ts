import { API_BASE_URL, HOSTED_API_URL } from "@/lib/constants";

export const IS_HOSTED_API = API_BASE_URL === HOSTED_API_URL;

type Credentials = { cloudName: string; apiKey?: string; apiSecret?: string };

/** `.env` lines read by the `storagebox` npm package. `STORAGEBOX_API_URL` is only needed off the hosted API. */
export function credentialsEnv({ cloudName, apiKey = "your_api_key", apiSecret = "your_api_secret" }: Credentials): string {
  return [
    `STORAGEBOX_CLOUD_NAME=${cloudName}`,
    `STORAGEBOX_API_KEY=${apiKey}`,
    `STORAGEBOX_API_SECRET=${apiSecret}`,
    ...(IS_HOSTED_API ? [] : [`STORAGEBOX_API_URL=${API_BASE_URL}`]),
  ].join("\n");
}

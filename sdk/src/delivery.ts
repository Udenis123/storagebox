import type { TransformOptions } from "./types.js";

/** Builds a transformation segment, e.g. `{ width: 400, format: "webp" }` → `w_400,f_webp`. */
export function transformation(options: TransformOptions): string {
  const parts = [
    options.width && `w_${options.width}`,
    options.height && `h_${options.height}`,
    options.crop && `c_${options.crop}`,
    options.quality && `q_${options.quality}`,
    options.format && `f_${options.format}`,
  ];
  return parts.filter(Boolean).join(",");
}

export const resolveTransform = (transform?: string | TransformOptions): string | undefined =>
  typeof transform === "object" ? transformation(transform) || undefined : transform || undefined;

/** Inserts a transformation into a permanent link: `/f/cloud/id.jpg` → `/f/cloud/w_400/id.jpg`. */
export function withTransform(fileUrl: string, transform?: string | TransformOptions): string {
  const segment = resolveTransform(transform);
  if (!segment) return fileUrl;
  const url = new URL(fileUrl);
  const parts = url.pathname.split("/");
  parts.splice(parts.length - 1, 0, segment);
  url.pathname = parts.join("/");
  return url.toString();
}

export interface DeliveryUrlInput {
  baseUrl: string;
  cloudName: string;
  publicId: string;
  ext: string;
  transform?: string | TransformOptions;
  download?: boolean;
}

/** Permanent link for a PUBLIC file built from its parts. Private files need `files.signedUrl`. */
export function deliveryUrl({ baseUrl, cloudName, publicId, ext, transform, download }: DeliveryUrlInput): string {
  const segment = resolveTransform(transform);
  const path = [cloudName, segment, `${publicId}.${ext}`].filter(Boolean).join("/");
  return `${baseUrl.replace(/\/+$/, "")}/f/${path}${download ? "?dl=1" : ""}`;
}

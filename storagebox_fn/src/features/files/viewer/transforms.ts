export type CropMode = "fill" | "fit" | "limit";
export type OutputFormat = "original" | "webp" | "avif" | "jpg" | "png";

export type CustomTransform = { width: string; height: string; crop: CropMode; quality: string; format: OutputFormat };

export type TransformPreset = { id: string; label: string; description: string; transform: string };

export const ORIGINAL_PRESET_ID = "original";
export const CUSTOM_PRESET_ID = "custom";

export const TRANSFORM_PRESETS: TransformPreset[] = [
  { id: ORIGINAL_PRESET_ID, label: "Original", description: "As uploaded", transform: "" },
  { id: "optimized", label: "Optimized", description: "WebP, quality 80", transform: "q_80,f_webp" },
  { id: "thumbnail", label: "Thumbnail", description: "150 × 150 crop", transform: "w_150,h_150,c_fill,f_webp" },
  { id: "square", label: "Square", description: "600 × 600 crop", transform: "w_600,h_600,c_fill,f_webp" },
  { id: "small", label: "Small", description: "400 px wide", transform: "w_400,c_limit,f_webp" },
  { id: "medium", label: "Medium", description: "800 px wide", transform: "w_800,c_limit,f_webp" },
  { id: "large", label: "Large", description: "1600 px wide", transform: "w_1600,c_limit,f_webp" },
  { id: "avif", label: "AVIF", description: "Smallest files", transform: "q_70,f_avif" },
];

export const CROP_OPTIONS = [
  { value: "fill", label: "Fill", description: "Crop to exactly the size" },
  { value: "fit", label: "Fit", description: "Fit inside, keep proportions" },
  { value: "limit", label: "Limit", description: "Only shrink, never enlarge" },
];

export const FORMAT_OPTIONS = [
  { value: "original", label: "Original format" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
];

export const DEFAULT_CUSTOM: CustomTransform = { width: "800", height: "", crop: "fit", quality: "80", format: "webp" };

export function buildTransform(custom: CustomTransform): string {
  const parts: string[] = [];
  if (custom.width) parts.push(`w_${custom.width}`);
  if (custom.height) parts.push(`h_${custom.height}`);
  if (custom.width || custom.height) parts.push(`c_${custom.crop}`);
  if (custom.quality) parts.push(`q_${custom.quality}`);
  if (custom.format !== "original") parts.push(`f_${custom.format}`);
  return parts.join(",");
}

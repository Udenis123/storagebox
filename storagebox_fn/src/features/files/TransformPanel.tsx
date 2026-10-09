import { useMemo, useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { CopyField } from "@/components/shared/CopyField";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiMutation } from "@/hooks/useApiMutation";
import type { StoredFile } from "@/lib/types";
import { createSignedLink } from "./api";

const CROP_OPTIONS = [
  { value: "fill", label: "Fill", description: "Crop to exactly the size" },
  { value: "fit", label: "Fit", description: "Fit inside, keep proportions" },
  { value: "limit", label: "Limit", description: "Only shrink, never enlarge" },
];
const FORMAT_OPTIONS = [
  { value: "original", label: "Original format" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
];
const SIGNED_TRANSFORM_SECONDS = 24 * 60 * 60;

type TransformState = { width: string; height: string; crop: string; quality: string; format: string };

function buildTransform(state: TransformState): string {
  const parts: string[] = [];
  if (state.width) parts.push(`w_${state.width}`);
  if (state.height) parts.push(`h_${state.height}`);
  if (state.width || state.height) parts.push(`c_${state.crop}`);
  if (state.quality) parts.push(`q_${state.quality}`);
  if (state.format !== "original") parts.push(`f_${state.format}`);
  return parts.join(",");
}

const numeric = (value: string) => value.replace(/\D/g, "").slice(0, 4);

export function TransformPanel({ file }: { file: StoredFile }) {
  const [state, setState] = useState<TransformState>({ width: "800", height: "", crop: "fit", quality: "80", format: "webp" });
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const transform = useMemo(() => buildTransform(state), [state]);
  const publicTransformUrl = file.url && transform ? file.url.replace(/\/([^/]+)$/, `/${transform}/$1`) : undefined;
  const signTransform = useApiMutation(
    () => createSignedLink(file.id, { expiresIn: SIGNED_TRANSFORM_SECONDS, transform }),
    { onSuccess: (link) => setSignedUrl(link.url), isSilent: true },
  );
  const previewUrl = publicTransformUrl ?? signedUrl ?? undefined;

  const update = (patch: Partial<TransformState>) => {
    setState((current) => ({ ...current, ...patch }));
    setSignedUrl(null);
  };

  return (
    <div className="grid gap-5">
      <p className="text-base text-muted-foreground">
        Resize, crop and convert on the fly. Each version is generated once, then cached.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Width (px)" htmlFor="tf-width">
          <Input id="tf-width" inputMode="numeric" value={state.width} onChange={(event) => update({ width: numeric(event.target.value) })} className={INPUT_CLASS} />
        </FormField>
        <FormField label="Height (px)" htmlFor="tf-height">
          <Input id="tf-height" inputMode="numeric" value={state.height} onChange={(event) => update({ height: numeric(event.target.value) })} className={INPUT_CLASS} />
        </FormField>
        <FormField label="Crop" htmlFor="tf-crop">
          <SearchableSelect options={CROP_OPTIONS} value={state.crop} onChange={(crop) => update({ crop })} />
        </FormField>
        <FormField label="Quality (1–100)" htmlFor="tf-quality">
          <Input id="tf-quality" inputMode="numeric" value={state.quality} onChange={(event) => update({ quality: numeric(event.target.value).slice(0, 3) })} className={INPUT_CLASS} />
        </FormField>
      </div>
      <FormField label="Format" htmlFor="tf-format">
        <SearchableSelect options={FORMAT_OPTIONS} value={state.format} onChange={(format) => update({ format })} />
      </FormField>

      <CopyField label="Transformation" value={transform || "(none)"} />
      {publicTransformUrl && <CopyField label="Transformed link" value={publicTransformUrl} canOpen />}
      {!file.url && (
        <Button disabled={!transform || signTransform.isPending} onClick={() => signTransform.mutate(undefined)}>
          {signTransform.isPending ? <Loader2 className="animate-spin" /> : <Wand2 />}
          Generate signed link (24 h)
        </Button>
      )}
      {signedUrl && <CopyField label="Signed transformed link" value={signedUrl} canOpen />}

      {previewUrl && transform && (
        <div className="grid justify-items-center gap-2 rounded-lg border bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:20px_20px] p-3">
          <img key={previewUrl} src={previewUrl} alt="Transformed preview" className="max-h-72 max-w-full rounded shadow-sm" />
        </div>
      )}
    </div>
  );
}

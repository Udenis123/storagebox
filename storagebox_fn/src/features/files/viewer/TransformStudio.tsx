import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { CopyField } from "@/components/shared/CopyField";
import { FormField, INPUT_CLASS } from "@/components/shared/FormField";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Input } from "@/components/ui/input";
import type { StoredFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useViewUrl } from "../hooks";
import {
  CROP_OPTIONS,
  CUSTOM_PRESET_ID,
  DEFAULT_CUSTOM,
  FORMAT_OPTIONS,
  ORIGINAL_PRESET_ID,
  TRANSFORM_PRESETS,
  buildTransform,
  type CropMode,
  type CustomTransform,
  type OutputFormat,
} from "./transforms";

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

type TransformStudioProps = { file: StoredFile; transform: string; onChange: (transform: string) => void };

/** Cloudinary-style transformation picker: presets plus a custom builder, previewed live on the stage. */
export function TransformStudio({ file, transform, onChange }: TransformStudioProps) {
  const [presetId, setPresetId] = useState(() => TRANSFORM_PRESETS.find((preset) => preset.transform === transform)?.id ?? ORIGINAL_PRESET_ID);
  const [custom, setCustom] = useState<CustomTransform>(DEFAULT_CUSTOM);
  const { url } = useViewUrl(file, transform);

  const choosePreset = (id: string, value: string) => {
    setPresetId(id);
    onChange(value);
  };
  const updateCustom = (patch: Partial<CustomTransform>) => {
    const next = { ...custom, ...patch };
    setCustom(next);
    choosePreset(CUSTOM_PRESET_ID, buildTransform(next));
  };

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">
        Pick a version to preview it. Each one is generated on first request, then cached — use its link anywhere.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {TRANSFORM_PRESETS.map((preset) => {
          const isActive = presetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => choosePreset(preset.id, preset.transform)}
              className={cn(
                "relative grid gap-0.5 rounded-lg border p-2.5 text-left transition",
                isActive ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              {isActive && <Check className="absolute top-2 right-2 size-4 text-primary" />}
              <span className="text-sm font-semibold">{preset.label}</span>
              <span className="text-xs text-muted-foreground">{preset.description}</span>
            </button>
          );
        })}
      </div>

      <div className={cn("grid gap-3 rounded-lg border p-3", presetId === CUSTOM_PRESET_ID && "border-primary/50 ring-2 ring-primary/10")}>
        <span className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4" /> Custom
        </span>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Width (px)" htmlFor="tf-width">
            <Input id="tf-width" inputMode="numeric" value={custom.width} onChange={(event) => updateCustom({ width: digits(event.target.value, 4) })} className={INPUT_CLASS} />
          </FormField>
          <FormField label="Height (px)" htmlFor="tf-height">
            <Input id="tf-height" inputMode="numeric" value={custom.height} onChange={(event) => updateCustom({ height: digits(event.target.value, 4) })} className={INPUT_CLASS} />
          </FormField>
          <FormField label="Crop" htmlFor="tf-crop">
            <SearchableSelect options={CROP_OPTIONS} value={custom.crop} onChange={(crop) => updateCustom({ crop: crop as CropMode })} />
          </FormField>
          <FormField label="Quality" htmlFor="tf-quality">
            <Input id="tf-quality" inputMode="numeric" value={custom.quality} onChange={(event) => updateCustom({ quality: digits(event.target.value, 3) })} className={INPUT_CLASS} />
          </FormField>
        </div>
        <FormField label="Format" htmlFor="tf-format">
          <SearchableSelect options={FORMAT_OPTIONS} value={custom.format} onChange={(format) => updateCustom({ format: format as OutputFormat })} />
        </FormField>
      </div>

      {transform && (
        <div className="grid gap-3">
          <CopyField label="Transformation" value={transform} />
          {url && <CopyField label={file.url ? "Transformed link" : "Signed transformed link (1 hour)"} value={url} canOpen />}
        </div>
      )}
    </div>
  );
}

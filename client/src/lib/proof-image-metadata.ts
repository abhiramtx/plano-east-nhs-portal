import exifr from "exifr";

export type ProofMetadataDateSource = "DateTimeOriginal" | "CreateDate" | "ModifyDate";

export interface ProofImageMetadata {
  metadataAvailable: boolean;
  capturedAt?: string;
  capturedAtSource?: ProofMetadataDateSource;
  make?: string;
  model?: string;
  lensModel?: string;
  software?: string;
  width?: number;
  height?: number;
  orientation?: number;
  iso?: number;
  exposureTime?: number;
  fNumber?: number;
  focalLength?: number;
  latitude?: number;
  longitude?: number;
  fileSizeBytes?: number;
  mimeType?: string;
}

const asText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const asDate = (value: unknown): string | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value !== "string" && typeof value !== "number") return undefined;

  const raw = String(value).trim();
  if (!raw) return undefined;
  const exifDate = raw.replace(
    /^(\d{4}):(\d{2}):(\d{2})(?:\s+|$)/,
    "$1-$2-$3T",
  );
  const parsed = new Date(exifDate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const firstDate = (
  parsed: Record<string, unknown>,
): { value?: string; source?: ProofMetadataDateSource } => {
  for (const [key, source] of [
    ["DateTimeOriginal", "DateTimeOriginal"],
    ["CreateDate", "CreateDate"],
    ["ModifyDate", "ModifyDate"],
  ] as const) {
    const value = asDate(parsed[key]);
    if (value) return { value, source };
  }
  return {};
};

const firstNumber = (
  parsed: Record<string, unknown>,
  keys: string[],
): number | undefined => {
  for (const key of keys) {
    const value = asNumber(parsed[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

/**
 * Reads only verification-relevant fields from the original file. This must
 * run before canvas compression because the browser-generated JPEG has no EXIF.
 */
export async function extractProofImageMetadata(file: File): Promise<ProofImageMetadata> {
  const base: ProofImageMetadata = {
    metadataAvailable: false,
    fileSizeBytes: file.size,
    ...(file.type ? { mimeType: file.type } : {}),
  };

  try {
    const parsed = (await exifr.parse(file, {
      tiff: {
        pick: ["Make", "Model", "Software", "ImageWidth", "ImageHeight", "Orientation"],
      },
      exif: {
        pick: [
          "DateTimeOriginal",
          "CreateDate",
          "ModifyDate",
          "ExifImageWidth",
          "ExifImageHeight",
          "ExposureTime",
          "FNumber",
          "ISO",
          "FocalLength",
          "LensModel",
        ],
      },
      gps: true,
      ihdr: true,
      xmp: false,
      iptc: false,
      icc: false,
      jfif: false,
      translateValues: true,
      reviveValues: true,
    })) as Record<string, unknown> | undefined;

    if (!parsed) return base;

    const captureDate = firstDate(parsed);
    const width = firstNumber(parsed, ["ImageWidth", "ExifImageWidth", "PixelXDimension"]);
    const height = firstNumber(parsed, ["ImageHeight", "ExifImageHeight", "PixelYDimension"]);
    const latitude = firstNumber(parsed, ["latitude", "Latitude", "GPSLatitude"]);
    const longitude = firstNumber(parsed, ["longitude", "Longitude", "GPSLongitude"]);
    const metadata = Object.fromEntries(
      Object.entries({
      ...base,
      metadataAvailable: Boolean(
        captureDate.value ||
        asText(parsed.Make) ||
        asText(parsed.Model) ||
        asText(parsed.LensModel) ||
        asText(parsed.Software) ||
        asNumber(parsed.Orientation) !== undefined ||
        asNumber(parsed.ISO) !== undefined ||
        asNumber(parsed.ExposureTime) !== undefined ||
        asNumber(parsed.FNumber) !== undefined ||
        asNumber(parsed.FocalLength) !== undefined ||
        latitude !== undefined ||
        longitude !== undefined,
      ),
      capturedAt: captureDate.value,
      capturedAtSource: captureDate.source,
      make: asText(parsed.Make),
      model: asText(parsed.Model),
      lensModel: asText(parsed.LensModel),
      software: asText(parsed.Software),
      width,
      height,
      orientation: asNumber(parsed.Orientation),
      iso: asNumber(parsed.ISO),
      exposureTime: asNumber(parsed.ExposureTime),
      fNumber: asNumber(parsed.FNumber),
      focalLength: asNumber(parsed.FocalLength),
      latitude,
      longitude,
      }).filter(([, value]) => value !== undefined),
    ) as ProofImageMetadata;

    return metadata;
  } catch (error) {
    console.warn("Unable to read photo EXIF metadata:", error);
    return base;
  }
}
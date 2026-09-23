import {
  Aperture,
  Camera,
  Clock3,
  Compass,
  FileImage,
  Focus,
  Gauge,
  Globe2,
  Image as ImageIcon,
  Info,
  MapPin,
  Ruler,
  Scan,
} from "lucide-react";
import type { ProofImageMetadata } from "@/lib/proof-image-metadata";

interface ProofMetadataProps {
  metadata?: ProofImageMetadata;
  serviceDate?: string | Date;
  compact?: boolean;
}

const formatDate = (value: string | Date | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatNumber = (value: number | undefined, digits = 1): string | null =>
  value === undefined || !Number.isFinite(value) ? null : value.toFixed(digits);

const formatExposure = (value: number | undefined): string | null => {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return null;
  if (value < 1) {
    const denominator = Math.round(1 / value);
    return denominator > 1 ? `1/${denominator} sec` : `${value.toFixed(3)} sec`;
  }
  return `${value.toFixed(2)} sec`;
};

const formatFileSize = (bytes: number | undefined): string | null => {
  if (bytes === undefined || !Number.isFinite(bytes)) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatGps = (latitude?: number, longitude?: number): string | null => {
  if (latitude === undefined || longitude === undefined) return null;
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};

const sourceLabel = (source?: string): string => {
  if (source === "DateTimeOriginal") return "original capture";
  if (source === "CreateDate") return "file created";
  if (source === "ModifyDate") return "file modified";
  return "EXIF";
};

export function ProofMetadata({ metadata, serviceDate, compact = false }: ProofMetadataProps) {
  const capturedDate = formatDate(metadata?.capturedAt);
  const enteredDate = formatDate(serviceDate);
  const capturedCalendarDate = metadata?.capturedAt
    ? new Date(metadata.capturedAt).toLocaleDateString()
    : null;
  const enteredCalendarDate = serviceDate
    ? new Date(serviceDate).toLocaleDateString()
    : null;
  const datesMatch = Boolean(capturedCalendarDate && enteredCalendarDate && capturedCalendarDate === enteredCalendarDate);
  const gps = formatGps(metadata?.latitude, metadata?.longitude);
  const hasDetails = Boolean(
    metadata?.make ||
    metadata?.model ||
    metadata?.lensModel ||
    metadata?.software ||
    metadata?.width ||
    metadata?.height ||
    metadata?.orientation ||
    metadata?.iso ||
    metadata?.exposureTime ||
    metadata?.fNumber ||
    metadata?.focalLength ||
    gps ||
    metadata?.fileSizeBytes,
  );

  if (!metadata) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-[#2d4542] bg-[#172321] p-3 text-sm text-[#b6c5c0]">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8bb9ae]" />
        <div>
          <p className="font-medium text-[#f3efe6]">Photo metadata not available</p>
          <p className="mt-0.5 text-xs">This proof was uploaded before EXIF verification was added.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className={`rounded-lg border p-3 ${capturedDate ? "border-[#2d625a] bg-[#132b28]" : "border-[#6c5226] bg-[#2b2415]"}`}>
        <div className="flex items-start gap-2">
          <Clock3 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${capturedDate ? "text-[#8bd0c1]" : "text-[#e4bd79]"}`} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#aab8b2]">Photo captured / created</p>
            {capturedDate ? (
              <>
                <p className="mt-0.5 font-semibold text-[#f3efe6]">{capturedDate}</p>
                <p className="text-xs text-[#aab8b2]">From {sourceLabel(metadata.capturedAtSource)} metadata</p>
                {enteredDate && (
                  <p className={`mt-1 text-xs font-medium ${datesMatch ? "text-[#8bd0c1]" : "text-[#e4bd79]"}`}>
                    {datesMatch ? "Matches" : "Does not match"} entered service date ({enteredDate})
                  </p>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-sm font-medium text-[#e4bd79]">No capture date found in this photo</p>
            )}
          </div>
        </div>
      </div>

      {!metadata.metadataAvailable && (
        <div className="flex items-start gap-2 rounded-lg border border-[#6c5226] bg-[#2b2415] p-3 text-sm text-[#e4bd79]">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">EXIF metadata unavailable</p>
            <p className="mt-0.5 text-xs">This image does not contain readable camera metadata. It is not treated as independently date-verified.</p>
          </div>
        </div>
      )}

      {hasDetails && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(metadata.make || metadata.model) && (
            <div className="flex items-start gap-2 rounded-md bg-[#1b2725] p-2.5">
              <Camera className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#aab8b2]" />
              <div><p className="text-[11px] uppercase tracking-wide text-[#8b9d97]">Camera</p><p className="text-sm text-[#edf2ef]">{[metadata.make, metadata.model].filter(Boolean).join(" ")}</p></div>
            </div>
          )}
          {(metadata.width || metadata.height) && (
            <div className="flex items-start gap-2 rounded-md bg-[#1b2725] p-2.5">
              <Ruler className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#aab8b2]" />
              <div><p className="text-[11px] uppercase tracking-wide text-[#8b9d97]">Image dimensions</p><p className="text-sm text-[#edf2ef]">{metadata.width ?? "?"} × {metadata.height ?? "?"} px</p></div>
            </div>
          )}
          {metadata.orientation !== undefined && (
            <div className="flex items-start gap-2 rounded-md bg-[#1b2725] p-2.5">
              <Compass className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#aab8b2]" />
              <div><p className="text-[11px] uppercase tracking-wide text-[#8b9d97]">Orientation</p><p className="text-sm text-[#edf2ef]">EXIF orientation {metadata.orientation}</p></div>
            </div>
          )}
          {(metadata.iso !== undefined || metadata.exposureTime !== undefined || metadata.fNumber !== undefined) && (
            <div className="flex items-start gap-2 rounded-md bg-[#1b2725] p-2.5">
              <Gauge className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#aab8b2]" />
              <div><p className="text-[11px] uppercase tracking-wide text-[#8b9d97]">Exposure</p><p className="text-sm text-[#edf2ef]">{[metadata.iso !== undefined ? `ISO ${metadata.iso}` : null, formatExposure(metadata.exposureTime), metadata.fNumber !== undefined ? `ƒ/${formatNumber(metadata.fNumber, 1)}` : null].filter(Boolean).join(" · ")}</p></div>
            </div>
          )}
          {metadata.focalLength !== undefined && (
            <div className="flex items-start gap-2 rounded-md bg-[#1b2725] p-2.5">
              <Focus className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#aab8b2]" />
              <div><p className="text-[11px] uppercase tracking-wide text-[#8b9d97]">Focal length</p><p className="text-sm text-[#edf2ef]">{formatNumber(metadata.focalLength, 1)} mm</p></div>
            </div>
          )}
          {metadata.lensModel && (
            <div className="flex items-start gap-2 rounded-md bg-[#1b2725] p-2.5">
              <Aperture className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#aab8b2]" />
              <div><p className="text-[11px] uppercase tracking-wide text-[#8b9d97]">Lens</p><p className="text-sm text-[#edf2ef]">{metadata.lensModel}</p></div>
            </div>
          )}
          {metadata.software && (
            <div className="flex items-start gap-2 rounded-md bg-[#1b2725] p-2.5">
              <Scan className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#aab8b2]" />
              <div><p className="text-[11px] uppercase tracking-wide text-[#8b9d97]">Software</p><p className="text-sm text-[#edf2ef]">{metadata.software}</p></div>
            </div>
          )}
          {gps && (
            <div className="flex items-start gap-2 rounded-md bg-[#1b2725] p-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#aab8b2]" />
              <div><p className="text-[11px] uppercase tracking-wide text-[#8b9d97]">GPS coordinates</p><p className="text-sm text-[#edf2ef]">{gps}</p><p className="text-[11px] text-[#8b9d97]">Embedded by the camera</p></div>
            </div>
          )}
          {metadata.fileSizeBytes !== undefined && (
            <div className="flex items-start gap-2 rounded-md bg-[#1b2725] p-2.5">
              <FileImage className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#aab8b2]" />
              <div><p className="text-[11px] uppercase tracking-wide text-[#8b9d97]">Original file</p><p className="text-sm text-[#edf2ef]">{formatFileSize(metadata.fileSizeBytes)}{metadata.mimeType ? ` · ${metadata.mimeType}` : ""}</p></div>
            </div>
          )}
        </div>
      )}

      {metadata.metadataAvailable && !hasDetails && (
        <div className="flex items-start gap-2 text-xs text-[#aab8b2]">
          <ImageIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>Readable EXIF was found, but no additional verification fields were available.</span>
        </div>
      )}
      {gps && (
        <p className="flex items-center gap-1 text-[11px] text-[#8b9d97]">
          <Globe2 className="h-3 w-3" /> GPS is shown only when the camera embedded it.
        </p>
      )}
    </div>
  );
}
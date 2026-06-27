import type {
  LegacyPresentAuthoringData,
  PresentAuthoringData,
  PresentPartKey,
} from "@self-authoring/shared";
import {
  defaultPresentData,
  legacyPartFromOldData,
  normalizePresentData,
} from "@self-authoring/shared";
import { api } from "./api";

/** Loads present document, merging legacy faults/virtues docs if needed. */
export async function loadPresentDocument(): Promise<PresentAuthoringData> {
  const presentRes = await api<{ document: { data: PresentAuthoringData } | null }>(
    "/authoring/present"
  );
  if (presentRes.document?.data) {
    return normalizePresentData(presentRes.document.data);
  }

  const [faultsRes, virtuesRes] = await Promise.all([
    api<{ document: { data: LegacyPresentAuthoringData } | null }>("/authoring/faults"),
    api<{ document: { data: LegacyPresentAuthoringData } | null }>("/authoring/virtues"),
  ]);

  const hasLegacy = faultsRes.document?.data || virtuesRes.document?.data;
  if (!hasLegacy) return defaultPresentData();

  const merged: PresentAuthoringData = {
    ...defaultPresentData(),
    faults: faultsRes.document?.data
      ? legacyPartFromOldData(faultsRes.document.data, "faults")
      : defaultPresentData().faults,
    virtues: virtuesRes.document?.data
      ? legacyPartFromOldData(virtuesRes.document.data, "virtues")
      : defaultPresentData().virtues,
  };

  await api("/authoring/present", {
    method: "PUT",
    body: JSON.stringify(merged),
  });

  return merged;
}

/** Updates one part within present data immutably. */
export function updatePresentPart(
  data: PresentAuthoringData,
  part: PresentPartKey,
  patch: Partial<PresentAuthoringData[PresentPartKey]>
): PresentAuthoringData {
  return {
    ...data,
    [part]: { ...data[part], ...patch },
  };
}

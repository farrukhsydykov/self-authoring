import oceanItems from "@self-authoring/shared/ocean-items.json" with { type: "json" };
import type { OceanItem } from "@self-authoring/shared";

const items = oceanItems as OceanItem[];

export { items as oceanItems };

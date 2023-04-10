import { appState } from "../../state";
import type { Tool } from "../../types";
import { ArcStrategy } from "./arc";
import { HandStrategy } from "./hand";
import { PositionStrategy } from "./position";
import { SelectStrategy } from "./select";
import type { ToolStrategy } from "./types";

export const strategies: Record<Tool, ToolStrategy> = {
  arc: new ArcStrategy(appState),
  position: new PositionStrategy(appState),
  select: new SelectStrategy(appState),
  hand: new HandStrategy(appState),
};

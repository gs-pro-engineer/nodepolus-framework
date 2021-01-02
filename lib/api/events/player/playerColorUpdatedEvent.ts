import { PlayerColor } from "../../../types/enums";
import { PlayerInstance } from "../../player";
import { CancellableEvent } from "../types";

/**
 * Fired when a player's color has been updated.
 */
export class PlayerColorUpdatedEvent extends CancellableEvent {
  constructor(
    public readonly player: PlayerInstance,
    public readonly oldColor: PlayerColor,
    public newColor: PlayerColor,
  ) {
    super();
  }
}

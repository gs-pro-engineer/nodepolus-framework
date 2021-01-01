import { PlayerInstance } from "../../player";
import { CancellableEvent } from "..";

/**
 * Fired when a player has been exiled at the end of a meeting.
 */
export class PlayerExiledEvent extends CancellableEvent {
  constructor(
    public readonly player: PlayerInstance,
  ) {
    super();
  }
}

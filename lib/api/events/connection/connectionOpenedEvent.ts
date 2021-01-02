import { Connection } from "../../../protocol/connection";
import { DisconnectReason } from "../../../types";
import { DisconnectableEvent } from "../types";

/**
 * Fired when a connection to the server has been initialized with a Hello packet.
 */
export class ConnectionOpenedEvent extends DisconnectableEvent {
  constructor(
    public readonly connection: Connection,
  ) {
    super(DisconnectReason.custom("The server refused your connection"));
  }
}

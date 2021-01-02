import { BaseRootPacket } from "../../../protocol/packets/root";
import { CancellableEvent } from "../types";

export class ProxyPacketFromServerEvent extends CancellableEvent {
  constructor(
    public packet: BaseRootPacket,
  ) {
    super();
  }
}

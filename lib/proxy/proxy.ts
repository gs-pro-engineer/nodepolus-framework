import { PacketDestination } from "../protocol/packets/types/enums";
import { ProxyEvents, ProxyInstance } from "../api/proxy";
import { Connection } from "../protocol/connection";
import { ProxyConfig } from "../api/config";
import Emittery from "emittery";
import dgram from "dgram";

export class InternalProxy extends Emittery.Typed<ProxyEvents> implements ProxyInstance {
  public readonly serverConnection: Connection;

  private readonly toServerSocket: dgram.Socket = dgram.createSocket("udp4");

  constructor(public config: ProxyConfig, public clientConnection: Connection) {
    super();

    this.serverConnection = new Connection(config.server, this.toServerSocket, PacketDestination.Server);

    this.toServerSocket.on("message", msg => {
      this.serverConnection.emit("message", msg);
    });

    this.serverConnection.on("packet", packet => {
      this.clientConnection.emit("packet", packet);
    });
  }
}

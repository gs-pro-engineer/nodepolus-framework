import { HostGameResponsePacket } from "../../../lib/protocol/packets/root";
import { ServerLobbyJoinEvent } from "../../../lib/api/events/server";
import { PlayerJoinedEvent } from "../../../lib/api/events/player";
import { shuffleArrayClone } from "../../../lib/util/shuffle";
import { Logger } from "../../../lib/logger";
import { Server } from "../../../lib/server";
import repl from "repl";

declare const server: Server;

const logger = new Logger("Debug");

server.on("player.joined", (event: PlayerJoinedEvent) => {
  logger.log(event.player, " Connected");
});

server.on("server.lobby.join", (event: ServerLobbyJoinEvent) => {
  if (event.lobbyCode !== "RANDOM") {
    return;
  }

  const lobby = shuffleArrayClone(server.lobbies.filter(lob => lob.getConnections().length < 10 && lob.isPublic()))[0];

  event.connection.sendReliable([new HostGameResponsePacket(lobby.getCode())]);

  event.lobby = lobby;
});

repl.start();

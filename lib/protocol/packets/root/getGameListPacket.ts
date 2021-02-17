import { MessageReader, MessageWriter } from "../../../util/hazelMessage";
import { LobbyCount, LobbyListing } from "./types";
import { GameOptionsData } from "../../../types";
import { RootPacketType } from "../types/enums";
import { BaseRootPacket } from "../root";

/**
 * Root Packet ID: `0x10` (`16`)
 */
export class GetGameListRequestPacket extends BaseRootPacket {
  constructor(
    public includePrivate: boolean,
    public options: GameOptionsData,
  ) {
    super(RootPacketType.GetGameList);
  }

  static deserialize(reader: MessageReader): GetGameListRequestPacket {
    return new GetGameListRequestPacket(
      reader.readBoolean(),
      GameOptionsData.deserialize(reader, true),
    );
  }

  serialize(): MessageWriter {
    const writer = new MessageWriter().writeBoolean(this.includePrivate);

    this.options.serialize(writer, true);

    return writer;
  }
}

/**
 * Root Packet ID: `0x10` (`16`)
 */
export class GetGameListResponsePacket extends BaseRootPacket {
  constructor(
    public lobbies: LobbyListing[],
    public counts?: LobbyCount,
  ) {
    super(RootPacketType.GetGameList);
  }

  static deserialize(reader: MessageReader): GetGameListResponsePacket {
    let counts: LobbyCount | undefined;
    const lobbies: LobbyListing[] = [];

    reader.readAllChildMessages(child => {
      if (child.getTag() == 1) {
        counts = LobbyCount.deserialize(child);
      } else if (child.getTag() == 0) {
        child.readAllChildMessages(lobbyMessage => {
          lobbies.push(LobbyListing.deserialize(lobbyMessage));
        });
      }
    });

    return new GetGameListResponsePacket(
      lobbies,
      counts,
    );
  }

  serialize(): MessageWriter {
    const writer = new MessageWriter();

    if (this.counts) {
      writer.startMessage(1);
      this.counts.serialize(writer);
      writer.endMessage();
    }

    writer.startMessage(0);

    for (let i = 0; i < this.lobbies.length; i++) {
      writer.startMessage(0x01);
      this.lobbies[i].serialize(writer);
      writer.endMessage();
    }

    return writer.endMessage();
  }
}

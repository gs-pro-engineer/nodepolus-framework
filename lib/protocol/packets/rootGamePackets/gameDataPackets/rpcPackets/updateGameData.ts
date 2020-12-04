import { MessageReader, MessageWriter } from "../../../../../util/hazelMessage";
import { PlayerData } from "../../../../entities/gameData/playerData";
import { BaseRPCPacket } from "../../../basePacket";
import { RPCPacketType } from "../../../types";

export class UpdateGameDataPacket extends BaseRPCPacket {
  constructor(
    public readonly players: PlayerData[],
  ) {
    super(RPCPacketType.UpdateGameData);
  }

  static deserialize(reader: MessageReader): UpdateGameDataPacket {
    return new UpdateGameDataPacket(reader.readAllChildMessages(sub => PlayerData.deserialize(sub, sub.tag)));
  }

  serialize(): MessageWriter {
    const writer = new MessageWriter();

    for (let i = 0; i < this.players.length; i++) {
      writer.startMessage(this.players[i].id);
      this.players[i].serialize(writer, false);
      writer.endMessage();
    }

    return writer;
  }
}

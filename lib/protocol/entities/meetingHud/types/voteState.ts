import { MessageReader, MessageWriter } from "../../../../util/hazelMessage";
import { VoteStateMask } from "../../../../types/enums";

export class VoteState {
  constructor(
    public didReport: boolean,
    public didVote: boolean,
    public isDead: boolean,
    public votedFor: number,
  ) {}

  static deserialize(reader: MessageReader): VoteState {
    const state = reader.readByte();

    return new VoteState(
      (state & VoteStateMask.DidReport) == VoteStateMask.DidReport,
      (state & VoteStateMask.DidVote) == VoteStateMask.DidVote,
      (state & VoteStateMask.IsDead) == VoteStateMask.IsDead,
      (state & VoteStateMask.DidVote) == VoteStateMask.DidVote ? (state & VoteStateMask.VotedFor) - 1 : 14,
    );
  }

  serialize(writer: MessageWriter): void {
    writer.writeByte(
      (this.didReport ? VoteStateMask.DidReport : 0) |
      (this.didVote ? VoteStateMask.DidVote : 0) |
      (this.isDead ? VoteStateMask.IsDead : 0) |
      (this.didVote ? ((this.votedFor + 1) & VoteStateMask.VotedFor) : 15),
    );
  }

  /**
   * Gets a clone of the VoteState instance.
   */
  clone(): VoteState {
    return new VoteState(this.didReport, this.didVote, this.isDead, this.votedFor);
  }
}

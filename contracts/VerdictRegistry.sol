// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title VerdictRegistry — tamper-proof ledger of AI debates on 0G Chain.
/// @notice Anchors a keccak256 transcript hash + storage root URI for each debate.
contract VerdictRegistry {
    enum Mode { Debate, Research }

    struct Record {
        address author;
        bytes32 transcriptHash; // keccak256 of canonical transcript JSON
        string  storageRoot;    // 0G Storage root / URI (or ipfs://, https://)
        string  topic;          // user prompt (truncated client-side)
        string  winner;         // "A", "B", "TIE", or synthesis label
        Mode    mode;
        uint64  timestamp;
    }

    Record[] private _records;

    event DebateRecorded(
        uint256 indexed id,
        address indexed author,
        bytes32 indexed transcriptHash,
        Mode mode,
        string storageRoot
    );

    function recordDebate(
        bytes32 transcriptHash,
        string calldata storageRoot,
        string calldata topic,
        string calldata winner,
        Mode mode
    ) external returns (uint256 id) {
        id = _records.length;
        _records.push(Record({
            author: msg.sender,
            transcriptHash: transcriptHash,
            storageRoot: storageRoot,
            topic: topic,
            winner: winner,
            mode: mode,
            timestamp: uint64(block.timestamp)
        }));
        emit DebateRecorded(id, msg.sender, transcriptHash, mode, storageRoot);
    }

    function verify(uint256 id, bytes32 transcriptHash) external view returns (bool) {
        if (id >= _records.length) return false;
        return _records[id].transcriptHash == transcriptHash;
    }

    function getRecord(uint256 id) external view returns (Record memory) {
        require(id < _records.length, "not found");
        return _records[id];
    }

    function totalRecords() external view returns (uint256) {
        return _records.length;
    }
}

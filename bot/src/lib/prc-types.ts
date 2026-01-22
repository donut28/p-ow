
export interface PrcServer {
    Name: string
    OwnerId: number
    CoOwnerIds: number[]
    CurrentPlayers: number
    MaxPlayers: number
    JoinKey: string
    AccVerifiedReq: string
    TeamBalance: boolean
}

export interface PrcPlayer {
    Player: string // Format: "Name:UserId"
    Team: string
    Permission: number
    Vehicle: string
    Callsign: string
}

export interface PrcJoinLog {
    Player: string
    Timestamp: number
}

export interface PrcKillLog {
    Killer: string
    Killed: string
    Timestamp: number
}

export interface PrcCommandLog {
    Player: string
    Command: string
    Timestamp: number
}

export interface PrcPlayerDetails {
    name: string
    id: string
}

export function parsePrcPlayer(raw: string): PrcPlayerDetails {
    const parts = raw.split(":")
    return {
        name: parts[0] || "Unknown",
        id: parts[1] || "0"
    }
}

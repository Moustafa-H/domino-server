import { distributeDeck } from './utils'
import { Player } from './player'

type Hands = {
    [key: string]: string[]
}

export class Room {
    private name: string
    private players: Player[]
    private hands: Hands = {}
    private gameStarted = false
    private gameNumber = 0
    private turn = -1
    private deckDistributed = false
    private field: string[] = []
    private scores = [0, 0]
    private phase = 0
    private seats: {[key: number]: string} = {} // turn: player nickname
    private roundOver = false
    private blockedGame = false
  
    constructor(name: string, players: Player[]) {
      this.name = name
      this.players = players
    }

    getInfo(): string {
        return `Room Name: '${this.name}', Players in room: '${this.players}', Game started?: ${this.gameStarted}`
    }
  
    getName(): string {
      return this.name
    }

    getPlayers(): Player[] {
        return this.players
    }
    
    getHands(): Hands {
        return this.hands
    }
    
    getGameStarted(): boolean {
        return this.gameStarted
    }

    getGameNumber(): number {
        return this.gameNumber
    }

    getTurn(): number {
        return this.turn
    }
    
    getDeckDistributed(): boolean {
        return this.deckDistributed
    }

    getField(): string[] {
        return this.field
    }

    getFieldLength(): number {
        return this.field.length
    }

    getScores(): number[] {
        return this.scores
    }

    getPhase(): number {
        return this.phase
    }

    getRoundOver(): boolean {
        return this.roundOver
    }

    getSeats(): {[key: number]: string} {
        return this.seats
    }

    setGameStarted(value: boolean) {
        this.gameStarted = value
    }

    setDeckDistributed(value: boolean) {
        this.deckDistributed = value
    }

    setSeats(newSeats: {[key: number]: string}) {
        this.seats = newSeats
    }

    incrementGameNumber() {
        this.gameNumber++
    }

    rotateTurn() {
        let count = 0
        let whileFlag = true
        while (whileFlag) {
            if (count >= 4) {
                console.log('blocked game')
                this.blockedGame = true
                break
            }
            
            if (this.turn < 3)
                this.turn++
            else
                this.turn = 0
            count++

            for (let i = 0; i < this.hands[this.seats[this.turn]].length; i++) {
                if (this.hands[this.seats[this.turn]][i].includes(this.field[0][0]) || this.hands[this.seats[this.turn]][i].includes(this.field[this.field.length-1][1])) {
                    // console.log('this.hands[this.seats[this.turn]][i]:', this.hands[this.seats[this.turn]][i])
                    // console.log('this.field[0]:', this.field[0])
                    // console.log('this.field[this.field.length-1]:', this.field[this.field.length-1])
                    whileFlag = false
                    break
                }
            }
        }
    }
    
    addPlayer(newPlayer: Player) {
        this.players.push(newPlayer)
    }

    removePlayer(socketID: string) {
        const player = this.players.length!==0?this.players.find((player) => player.getSocketID() === socketID):undefined
        if (player) {
            const index = this.players.indexOf(player)
            this.players.splice(index, 1)
        }
    }

    giveOutHands() {
        const roomPlayers: string[] = []
        for (let i = 0; i < this.players.length; i++) {
            roomPlayers.push(this.seats[i])
        }
        this.hands = distributeDeck(roomPlayers)
        console.log('this.hands:', this.hands)
        console.log('this.seats:', this.seats)
        this.deckDistributed = true
        this.phase = 1
        for (let seatNum in this.seats) {
            if (this.seats.hasOwnProperty(seatNum) && this.hands[this.seats[seatNum]].includes('66')) {
                console.log(seatNum);
                
                this.turn = +seatNum
                console.log('turn:', this.turn)
                console.log('this.hands[this.seats[+seatNum]]', this.hands[this.seats[seatNum]])
            }
        }
    }

    private calcHandPoints(playerNickname: string): number {
        let points = 0
        for (const card of this.hands[playerNickname]) {
            points += Number(card[0]) + Number(card[1])
        }
        return points
    }
    
    addCardToField(card: string, player: Player, direction: string): void {
        if (direction === 'right')
            this.field.push(card)
        else {
            this.field.unshift(card)
        }
        console.log(`hands of ${player.getNickname()} before: ${this.hands[player.getNickname()]}`)
        const sentCard = card[0]>card[1]?card[1]+card[0]:card
        const idx = this.hands[player.getNickname()].indexOf(sentCard)
        this.hands[player.getNickname()].splice(idx, 1)
        console.log(`hands of ${player.getNickname()} after: ${this.hands[player.getNickname()]}`)
        // if player won
        if (this.hands[player.getNickname()].length === 0) {
            if (this.turn === 0) {
                this.scores[0] += this.calcHandPoints(this.seats[1]) + this.calcHandPoints(this.seats[2]) + this.calcHandPoints(this.seats[3])
            } else if (this.turn === 2) {
                this.scores[0] += this.calcHandPoints(this.seats[0]) + this.calcHandPoints(this.seats[1]) + this.calcHandPoints(this.seats[3])
            } else if (this.turn === 1) {
                this.scores[1] += this.calcHandPoints(this.seats[0]) + this.calcHandPoints(this.seats[2]) + this.calcHandPoints(this.seats[3])
            } else if (this.turn === 3) {
                this.scores[1] += this.calcHandPoints(this.seats[0]) + this.calcHandPoints(this.seats[1]) + this.calcHandPoints(this.seats[2])
            }
            this.roundOver = true
        }
    }

    clearField(): void {
        this.field = []
    }

    endGame(): void {
        this.hands = {}
        this.gameStarted = false
        this.gameNumber = 0
        this.turn = -1
        this.deckDistributed = false
        this.field = []
        this.scores = [0, 0]
        this.phase = 0
        this.seats = {}
        this.roundOver = false
    }
}
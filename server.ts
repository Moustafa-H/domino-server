import { Player } from './player'
import { Room } from './room'

const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)

import { Server, Socket } from 'socket.io'
const io = new Server(server, {
  cors: {
    origin: '*',
  },
})

let connectedClients: string[] = []
let players: Player[] = []
let rooms: Room[] = []

io.on('connection', (socket) => {
  console.log('connection by', socket.id)
  connectedClients.push(socket.id)
  console.log('connectedClients:', connectedClients)

  socket.on('disconnect', () => {
    console.log(socket.id, 'disconnected')
    const newConnectedClients = connectedClients.filter(prevClients => prevClients !== socket.id)
    connectedClients = newConnectedClients
    console.log('connectedClients after disconnect:', connectedClients)
    
    removePlayerFromRoom(socket)

    for (let i = 0; i < players.length; i++) {
      if (players[i].getSocketID() === socket.id) {
        players.splice(i, 1)
      }
    }
  })

  socket.on('init-player', (nickname: string) => {
    let player = players.length!==0?players.find((player) => player.getNickname() === nickname):undefined
    if (player === undefined) {
      player = new Player(socket.id, nickname)
      players.push(player)
      console.log(player.getInfo())
      socket.emit('init-player', (nickname))
    } else {
      socket.emit('already-exists')
    }
  })

  // room effects
  socket.on('get-rooms', () => {
    const newRooms = generateRoomsDictionary()
    socket.emit('get-rooms', (newRooms))
  })

  socket.on('create-room', (roomName: string) => {
    let player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    if (player) {
      let room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
      if (room === undefined) {
        room = new Room(roomName, [player])
        rooms.push(room)
        console.log('new room:', roomName, ', created by:', socket.id, ', current room players:', room.getPlayers())
        const newRooms = generateRoomsDictionary()
        socket.emit('create-room', ({newRooms, roomName}))
        socket.broadcast.emit('get-rooms', (newRooms))
      } else {
        socket.emit('already-exists')
      }
    }
  })

  socket.on('join-room', (roomName: string) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && !room.getPlayers().includes(player)) {
      room.addPlayer(player)
      console.log('player', socket.id, ', joined room', roomName, ', current room players:', room.getPlayers())
      const newRooms = generateRoomsDictionary()
      socket.emit('join-room', ({newRooms, roomName}))
      socket.emit('update-seats', (room.getSeats()))
      socket.broadcast.emit('get-rooms', (newRooms))
    }
  })

  socket.on('start-game', (roomName) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && room.getPlayers().includes(player)) {
      const newSeats = room.getSeats()      
      const newTurn = room.getTurn()
      room.setGameStarted(true)
      const len = room.getPlayers().length
      for (let i = 0; i < len; i++) {
        socket.to(room.getPlayers()[i].getSocketID()).emit('start-game', ({newTurn, newSeats}))
      }
      socket.emit('start-game', ({newTurn, newSeats}))
    }
  })

  socket.on('leave-room', () => {
    removePlayerFromRoom(socket)
  })

  socket.on('goto-seat', ({roomName, num}) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && room.getPlayers().includes(player)) {
      const newSeats = room.getSeats()
      if (newSeats[num] === undefined) {
        for (let seatNum in newSeats) {
          if (newSeats.hasOwnProperty(seatNum)) {
            if (newSeats[seatNum] === player.getNickname())
              delete newSeats[seatNum]
          }
        }
        newSeats[num] = player.getNickname()
      }
      room.setSeats(newSeats)
      const len = room.getPlayers().length
      for (let i = 0; i < len; i++) {
        socket.to(room.getPlayers()[i].getSocketID()).emit('update-seats', (room.getSeats()))
      }
      socket.emit('update-seats', (room.getSeats()))
    }
  })

  socket.on('goto-list', (roomName) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && room.getPlayers().includes(player)) {
      const newSeats = room.getSeats()
      for (let seatNum in newSeats) {
        if (newSeats.hasOwnProperty(seatNum)) {
          if (newSeats[seatNum] === player.getNickname())
            delete newSeats[seatNum]
        }
      }
      room.setSeats(newSeats)
      const len = room.getPlayers().length
      for (let i = 0; i < len; i++) {
        socket.to(room.getPlayers()[i].getSocketID()).emit('update-seats', (room.getSeats()))
      }
      socket.emit('update-seats', (room.getSeats()))
    }
  })

  // game effects
  socket.on('update-hands', (roomName: string) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && room.getPlayers().includes(player)) {
      if (room.getGameStarted() && !room.getDeckDistributed()) {
        room.giveOutHands()
        room.incrementGameNumber()
      }
      const newHands = modifyHands(player, room)
      const newScores = room.getScores()
      const newGameNum = room.getGameNumber()
      const newPhase = room.getPhase()
      const newTurn = room.getTurn()
      const newSeats = room.getSeats()
      socket.emit('update-hands', ({newHands, newScores, newGameNum, newPhase, newTurn, newSeats}))
    }
  })

  socket.on('play-card', ({roomName, sentCard, direction}) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && room.getPlayers().includes(player) && !room.getField().includes(sentCard)) {
      room.addCardToField(sentCard, player, direction)
      room.rotateTurn()
      const newBlockedGame = room.getBlockedGame()
      const newTurn = room.getTurn()
      const newField = room.getField()
      const len = room.getPlayers().length
      for (let i = 0; i < len; i++) {
        socket.to(room.getPlayers()[i].getSocketID()).emit('play-card', ({sentCard, newTurn, newField, newBlockedGame}))
      }
      socket.emit('play-card', ({sentCard, newTurn, newField, newBlockedGame}))
    }
  })

  socket.on('get-scores', (roomName: string) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && room.getPlayers().includes(player)) {
      socket.emit('get-scores', (room.getScores()))
      setTimeout(() => {
        if (room.getScores().includes(150)) {
          room.endGame()
          const newHands = room.getHands()
          const newGameStarted = room.getGameStarted()
          const newGameNumber = room.getGameNumber()
          const newTurn = room.getTurn()
          const newScores = room.getScores()
          const newPhase = room.getPhase()
          const newSeats = room.getSeats()
          socket.emit('game-ended', ({newHands, newGameStarted, newGameNumber, newTurn, newScores, newPhase, newSeats}))
        }
      }, 2000)
    }
  })
})

server.listen(3001, () => {
  console.log('Server listening on port 3001')
})

const removePlayerFromRoom = (socket: Socket) => {
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i] !== undefined) {
      for (let j = 0; j < rooms[i].getPlayers().length; j++) {
        if (rooms[i].getPlayers()[j].getSocketID() === socket.id) {
          rooms[i].removePlayer(socket.id)
          console.log('player', socket.id, 'left room', rooms[i].getName(), ', updated rooms:', rooms)
          if (rooms[i].getGameStarted()) {
            rooms[i].endGame()
            const newHands = modifyHands(rooms[i].getPlayers()[j], rooms[i])
            const newGameStarted = rooms[i].getGameStarted()
            const newGameNumber = rooms[i].getGameNumber()
            const newTurn = rooms[i].getTurn()
            const newScores = rooms[i].getScores()
            const newPhase = rooms[i].getPhase()
            const newSeats = rooms[i].getSeats()
            const len = rooms[i].getPlayers().length
            for (let k = 0; k < len; k++) {
              socket.to(rooms[i].getPlayers()[k].getSocketID()).emit('game-ended', {newHands, newGameStarted, newGameNumber, newTurn, newScores, newPhase, newSeats})
            }
          }
        }
      }
    
      if (rooms[i].getPlayers().length === 0) {
        console.log('room', rooms[i].getName(), 'is now empty, deleting...')
        rooms.splice(i, 1)
        console.log('updated rooms:', rooms)
      }
    }
  }

  socket.emit('leave-room')
  const newRooms = generateRoomsDictionary()
  socket.emit('get-rooms', (newRooms))
  socket.broadcast.emit('get-rooms', (newRooms))
}

const generateRoomsDictionary = () => {
  const newRooms: {[name: string]: string[]} = {}
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i] !== undefined) {
      const len = rooms[i].getPlayers().length
      for (let j = 0; j < len; j++) {
        if (newRooms[rooms[i].getName()] !== undefined)
          newRooms[rooms[i].getName()].push(rooms[i].getPlayers()[j].getNickname())
        else
          newRooms[rooms[i].getName()] = [rooms[i].getPlayers()[j].getNickname()]
      }
    }
  }
  return newRooms
}

const modifyHands = (player: Player, room: Room): {[key: string]: string[]} => {
  const newHands: {[key: string]: string[]} = {}
  const len = room.getPlayers().length
  for (let i = 0; i < len; i++) {
    if (room.getSeats()[i] !== player?.getNickname())
      newHands[room.getSeats()[i]]!==undefined?newHands[room.getSeats()[i]]=Array(newHands[room.getSeats()[i]].length).fill('facedown'):newHands[room.getSeats()[i]]=Array(7).fill('facedown')
    else
      newHands[room.getSeats()[i]] = room.getHands()[room.getSeats()[i]]
  }
  return newHands
}
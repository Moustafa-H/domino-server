const deckCards = [
    '00', '01', '02', '03', '04', '05', '06',
    '11', '12', '13', '14', '15', '16',
    '22', '23', '24', '25', '26',
    '33', '34', '35', '36',
    '44', '45', '46',
    '55', '56',
    '66'
]

type Hands = {
  [key: string]: string[]
}

export const distributeDeck = (players: string[]): Hands => {
    const hands: Hands = {}
    const handsHash: {[key: string]: number}[] = [{}, {}, {}, {}]
    const deck = [...deckCards]
    
    // shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = deck[i]
      deck[i] = deck[j]
      deck[j] = temp
    }

    // creating initial hands dictionary
    for (let i = 0; i < 4; i++) {
        deckCards.forEach(card => {
            handsHash[i][card] = 0
        })
    }
  
    // adding cards to hands dictionary
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 7; j++) {
        const drawnCard = deck[0]
        handsHash[i][drawnCard] = 1
        deck.shift()
      }
    }
    
    // adding cards to hands while sorting
    handsHash.forEach((hash, index) => {
      Object.keys(hash).forEach(card => {
        if (hash[card] === 1) {
          if (hands[players[index]] === undefined)
            hands[players[index]] = [card]
          else
            hands[players[index]].push(card)
        }
      })
    })

    return hands
}
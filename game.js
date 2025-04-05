// Game state
const gameState = {
    players: [],
    communityCards: [],
    pot: 0,
    currentPlayer: 0,
    deck: null,
    smallBlind: 10,
    bigBlind: 20
};

// DOM elements
const setupScreen = document.getElementById('setup-screen');
const gameContainer = document.getElementById('game-container');
const playersContainer = document.getElementById('players-container');
const raiseAmount = document.getElementById('raise-amount');
const raiseValue = document.getElementById('raise-value');

// Initialize game when page loads
window.onload = function() {
    // Set up button event listeners
    document.getElementById('start-game').addEventListener('click', startGame);
    
    // Update raise amount display
    raiseAmount.addEventListener('input', function() {
        raiseValue.textContent = this.value;
    });
    
    // Game action buttons
    document.getElementById('fold').addEventListener('click', () => playerAction('fold'));
    document.getElementById('check').addEventListener('click', () => playerAction('check'));
    document.getElementById('call').addEventListener('click', () => playerAction('call'));
    document.getElementById('raise').addEventListener('click', () => {
        const amount = parseInt(raiseAmount.value);
        playerAction('raise', amount);
    });
};

// Start game with custom settings
function startGame() {
    const humanPlayers = parseInt(document.getElementById('human-players').value);
    const botPlayers = parseInt(document.getElementById('bot-players').value);
    const startingChips = parseInt(document.getElementById('starting-chips').value);
    
    // Validate inputs
    if (humanPlayers < 1 || botPlayers < 0 || humanPlayers + botPlayers < 2 || humanPlayers + botPlayers > 10) {
        alert('Invalid player configuration. You need 2-10 total players.');
        return;
    }
    
    // Hide setup screen and show game
    setupScreen.style.display = 'none';
    gameContainer.style.display = 'block';
    
    // Initialize game state
    initGame(humanPlayers, botPlayers, startingChips);
}

// Initialize game with custom players
function initGame(humanCount, botCount, startingChips) {
    gameState.players = [];
    gameState.communityCards = [];
    gameState.pot = 0;
    gameState.currentPlayer = 0;
    gameState.deck = new Deck();
    
    // Create human players
    for (let i = 0; i < humanCount; i++) {
        gameState.players.push({
            id: i,
            name: `Player ${i + 1}`,
            chips: startingChips,
            hand: [],
            folded: false,
            isHuman: true
        });
    }
    
    // Create bots
    for (let i = 0; i < botCount; i++) {
        gameState.players.push({
            id: humanCount + i,
            name: `Bot ${i + 1}`,
            chips: startingChips,
            hand: [],
            folded: false,
            isHuman: false
        });
    }
    
    // Position players around the table
    positionPlayers();
    
    // Start the game
    startHand();
}

// Position players around the table visually
function positionPlayers() {
    playersContainer.innerHTML = '';
    const playerCount = gameState.players.length;
    const radius = 150;
    const centerX = 300;
    const centerY = 200;
    
    gameState.players.forEach((player, index) => {
        const angle = (index * (2 * Math.PI / playerCount)) - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        const playerElement = document.createElement('div');
        playerElement.className = `player ${player.isHuman ? 'human' : 'bot'}`;
        playerElement.id = `player-${player.id}`;
        playerElement.style.left = `${x}px`;
        playerElement.style.top = `${y}px`;
        playerElement.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div class="player-chips">$${player.chips}</div>
            <div class="player-hand"></div>
        `;
        
        playersContainer.appendChild(playerElement);
    });
}

// Start a new hand
function startHand() {
    // Reset folded status
    gameState.players.forEach(player => player.folded = false);
    
    // Create new deck and shuffle
    gameState.deck = new Deck();
    
    // Deal cards to players
    gameState.players.forEach(player => {
        player.hand = [gameState.deck.deal(), gameState.deck.deal()];
        updatePlayerDisplay(player);
    });
    
    // Post blinds
    postBlinds();
    
    // Update UI
    updateUI();
    
    // Start betting round
    startBettingRound();
}

// Update player display
function updatePlayerDisplay(player) {
    const playerElement = document.getElementById(`player-${player.id}`);
    if (!playerElement) return;
    
    const handElement = playerElement.querySelector('.player-hand');
    handElement.innerHTML = '';
    
    if (player.isHuman || gameState.showAllCards) {
        // Show full cards for human players or when revealing
        player.hand.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'player-card';
            cardElement.textContent = `${card.rank}${card.suit[0].toUpperCase()}`;
            handElement.appendChild(cardElement);
        });
    } else if (!player.folded) {
        // Show face down cards for bots
        for (let i = 0; i < player.hand.length; i++) {
            const cardElement = document.createElement('div');
            cardElement.className = 'player-card';
            cardElement.textContent = '🂠';
            handElement.appendChild(cardElement);
        }
    }
    
    // Update chip count
    const chipsElement = playerElement.querySelector('.player-chips');
    chipsElement.textContent = `$${player.chips}`;
    
    // Highlight current player
    if (player.id === gameState.currentPlayer) {
        playerElement.style.boxShadow = '0 0 10px yellow';
    } else {
        playerElement.style.boxShadow = 'none';
    }
}

// Post small and big blinds
function postBlinds() {
    const playerCount = gameState.players.length;
    const smallBlindPos = gameState.handNumber % playerCount;
    const bigBlindPos = (smallBlindPos + 1) % playerCount;
    
    // Post small blind
    const smallBlindPlayer = gameState.players[smallBlindPos];
    const smallBlindAmount = Math.min(gameState.smallBlind, smallBlindPlayer.chips);
    smallBlindPlayer.chips -= smallBlindAmount;
    gameState.pot += smallBlindAmount;
    
    // Post big blind
    const bigBlindPlayer = gameState.players[bigBlindPos];
    const bigBlindAmount = Math.min(gameState.bigBlind, bigBlindPlayer.chips);
    bigBlindPlayer.chips -= bigBlindAmount;
    gameState.pot += bigBlindAmount;
    
    // Update current player (next after big blind)
    gameState.currentPlayer = (bigBlindPos + 1) % playerCount;
    
    // Update displays
    updatePlayerDisplay(smallBlindPlayer);
    updatePlayerDisplay(bigBlindPlayer);
}

// Start betting round
function startBettingRound() {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    
    if (currentPlayer.folded) {
        advanceToNextPlayer();
        return;
    }
    
    if (currentPlayer.isHuman) {
        // Enable controls for human player
        enablePlayerControls(true);
    } else {
        // Bot makes decision
        enablePlayerControls(false);
        setTimeout(() => {
            botAction(currentPlayer);
        }, 1000);
    }
}

// Bot decision making (enhanced from previous version)
function botAction(bot) {
    // Simple poker strategy - can be enhanced further
    const handStrength = evaluateHandStrength(bot);
    const randomFactor = Math.random() * 0.2 - 0.1; // -0.1 to 0.1
    
    const aggression = 0.5 + randomFactor; // Base aggression with small variation
    const effectiveStrength = handStrength * aggression;
    
    // Determine action based on hand strength and aggression
    let action;
    if (effectiveStrength < 0.3) {
        action = Math.random() < 0.7 ? 'fold' : 'call';
    } else if (effectiveStrength < 0.6) {
        action = Math.random() < 0.3 ? 'fold' : (Math.random() < 0.6 ? 'call' : 'raise');
    } else {
        action = Math.random() < 0.8 ? 'raise' : 'call';
    }
    
    // Determine amount for raise
    let amount = 0;
    if (action === 'raise') {
        const baseAmount = gameState.bigBlind * 2;
        const strengthMultiplier = 1 + handStrength * 3;
        amount = Math.floor(baseAmount * strengthMultiplier);
        amount = Math.min(amount, bot.chips);
    }
    
    // Execute the action
    executeAction(bot, action, amount);
}

// Very simplified hand evaluation (0 to 1)
function evaluateHandStrength(player) {
    // In a real game, you'd evaluate the actual hand strength
    // This is a simplified version that just looks at card ranks
    const cardValues = player.hand.map(card => {
        const rank = card.rank;
        if (rank === 'A') return 14;
        if (rank === 'K') return 13;
        if (rank === 'Q') return 12;
        if (rank === 'J') return 11;
        return parseInt(rank);
    });
    
    const highCard = Math.max(...cardValues);
    const pair = cardValues[0] === cardValues[1];
    
    // Normalize to 0-1 range
    let strength = highCard / 14; // 0-1 based on high card
    
    if (pair) {
        strength = 0.5 + (highCard / 28); // 0.5-1 for pairs
    }
    
    return strength;
}

// Execute player/bot action
function executeAction(player, action, amount = 0) {
    switch (action) {
        case 'fold':
            player.folded = true;
            break;
        case 'check':
            // Only valid if no bet to call
            break;
        case 'call':
            const callAmount = Math.min(gameState.currentBet, player.chips);
            player.chips -= callAmount;
            gameState.pot += callAmount;
            break;
        case 'raise':
            player.chips -= amount;
            gameState.pot += amount;
            gameState.currentBet = amount;
            break;
    }
    
    // Update display
    updatePlayerDisplay(player);
    
    // Advance to next player
    advanceToNextPlayer();
}

// Advance to next active player or end betting round
function advanceToNextPlayer() {
    // Implementation would go here
    // This would handle moving to next player or ending the betting round
    // and progressing through flop, turn, river, etc.
}

// Enable/disable player controls
function enablePlayerControls(enabled) {
    document.getElementById('fold').disabled = !enabled;
    document.getElementById('check').disabled = !enabled;
    document.getElementById('call').disabled = !enabled;
    document.getElementById('raise').disabled = !enabled;
    document.getElementById('raise-amount').disabled = !enabled;
}

// Update game UI
function updateUI() {
    document.getElementById('game-info').textContent = 
        `Pot: $${gameState.pot} | Current Bet: $${gameState.currentBet || 0}`;
}

// Card and Deck classes remain the same as before
class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
        this.shuffle();
    }
    
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    deal() {
        return this.cards.pop();
    }
}
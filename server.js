const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const roles = [
    { name: 'SEE NO EVIL', description: 'If you see any evidence of a crewmate’s death, you must kill yourself. Tell none of the others what you saw or why you’re trying to get yourself killed.' },
    { name: 'WILDLIFE SPECIALIST', description: 'Scan and survive an encounter with every creature in the game, including those without bestiary entries, before the quota goes above 800. If you die to a creature, it is taken off your completed list and you’ll have to find it again.' },
    { name: 'PYROTECHNICS', description: 'With any landmine you come across, you must disarm it by placing an item on top of it.' },
    { name: 'SCARED STRAIGHT', description: 'Upon hearing or seeing a creature, you must wait at least 20 seconds before being allowed to exit the facility.' },
    { name: 'BULL RUNNER', description: 'You’re not allowed to crouch around Eyeless Dogs, making you forced to dodge their charges.' },
    { name: 'RESIDENT JOKESTER', description: 'With any chance that you get, you must try to convince your crewmates that you’re dead. Whether it’s going silent when they call your name, or holding still when you know someone is watching you on the monitor.' },
    { name: 'SABOTAGE', description: 'You must kill one crewmate each quota, and attempt to cover it up without any of your crewmates figuring it out before the day ends.' },
    { name: 'EAGER TO LEAVE', description: 'Upon death, you must immediately vote for the autopilot to leave early.' },
    { name: 'UNQUALIFIED', description: 'You’re unable to describe or say the name of any creatures until you scan it.' },
    { name: 'IMPULSE CONTROL', description: 'Consistently make poor decisions. Step onto landmines, spend the crew’s credits on decorations, and run into danger, but don’t die on purpose (like jumping into pitfalls).' },
    { name: 'SENTIMENTALITY', description: 'If a crew member’s body is able to be recovered, you must recover it or you’ll die.' },
    { name: 'DANCING WITH DEATH', description: 'Attempt to die in every way possible. Die to bludgeoning, gravity, a blast, kicking, strangulation, suffocation, mauling, gunshots, crushing, drowning, being abandoned, electrocution, and unknown causes.' },
    { name: 'PRIVATE INVESTIGATION', description: 'Attempt to collect every possible data chip on each moon before your run ends. You can’t let your crewmates know what you’re up to, but can nudge them into going to certain moons to complete your mission.' },
    { name: 'PACIFIST', description: 'You’re incapable of killing or using any kind of weapon on creatures or crewmates, including stunning items. If you accidentally hit or killed something / someone, you must discard the item used to do it.' },
    { name: 'SAVIOR', description: 'If you hear or see a crewmate in trouble, you have to come to their aid, no matter how dangerous it may be.' },
    { name: 'SCAREDY CAT', description: 'You’re too scared to go anywhere alone. You must bring at least one other crewmate with you inside.' },
    { name: 'DAREDEVIL', description: 'You can’t leave a moon with full health - you must take damage in some way. Whether it’s jumping off a ledge or running into the claws of a creature, you’ll risk it all.' },
    { name: 'NEW HIRE', description: 'You must call each crewmate by the wrong name more than once.' },
    { name: 'GULLIBLE', description: 'No matter the request, you can’t refuse. You’re forced to fulfill it to the best of your ability.' },
    { name: 'STONE FACED', description: 'You’re impossible to scare - or so it seems. You aren’t allowed to crack under pressure, and have to keep a calm demeanor at all times. Panic can always make a situation worse, remember that!' },
    { name: 'ACROPHOBIA', description: 'You’re terrified of heights, and can’t cross pitfalls or jump across them.' },
    { name: 'WEAK-ARMED', description: 'You’re unable to carry any two-handed items, including the corpses of your crewmates.' },
    { name: 'MUSE', description: 'Upon encountering a Comedy Mask or a Tragedy Mask, you feel extremely compelled to put it on.' },
    { name: 'ENERGY CONSERVATION', description: 'You can’t recharge any items, or close the doors to the ship.' },
    { name: 'FINDERS KEEPERS', description: 'You must keep the first item you pick up in your inventory until the next quota. *Excludes two-handed items*' },
    { name: 'LONE WOLF', description: 'You always split off from the group, and can’t stick together with another crewmate.' },
    { name: 'NO MERCY', description: 'Weapons are your first priority, protecting yourself and your crewmates is the most important thing to you. If you have a shotgun, safety must always be off. You’ll run after anything you can kill, given you have something to slaughter it with.' },
    { name: 'DONATIONS', description: 'Any time you come across a Hoarding Bug, you must give it the first item in your inventory. You cannot take any items you donate back, and cannot knowingly steal anything from a stash.' }
];

let players = [];
let assignedRoles = {};
let playerGuesses = {}; // To track guesses

// Simple in-memory user storage (username and password)
const users = {
    'gamemaster': 'password123',
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Note: For development. Change to true in production with HTTPS.
}));

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/');
    }
}

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        req.session.user = username;
        res.redirect('/game');
    } else {
        res.redirect('/?error=Invalid%20username%20or%20password');
    }
});

app.get('/game', (req, res) => {
    res.sendFile(__dirname + '/public/game.html');
});

app.get('/isAuthenticated', (req, res) => {
    res.json({ isAuthenticated: !!req.session.user });
});

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('joinGame', (name) => {
        if (!players.some(player => player.id === socket.id)) {
            players.push({ id: socket.id, name, score: 0 });
            socket.emit('joined', { id: socket.id });

            if (Object.keys(assignedRoles).length > 0) {
                // Assign role to the new player if roles are already assigned
                const role = assignRole(socket.id);
                socket.emit('roleAssigned', role);
            }
            
            io.emit('updatePlayers', players);
        }
    });

    socket.on('startGame', () => {
        if (players.length > 0) {
            assignedRoles = assignRoles(players);
            playerGuesses = {}; // Reset guesses
            for (const [player, role] of Object.entries(assignedRoles)) {
                io.to(player).emit('roleAssigned', role);
            }
            io.emit('gameStarted');
        }
    });

    socket.on('reroll', () => {
        if (players.length > 0) {
            assignedRoles = assignRoles(players);
            playerGuesses = {}; // Reset guesses
            for (const [player, role] of Object.entries(assignedRoles)) {
                io.to(player).emit('roleAssigned', role);
            }
        }
    });

    socket.on('guessRole', ({ targetPlayerId, guessedRole }) => {
        const guessingPlayer = players.find(p => p.id === socket.id);
        if (guessingPlayer) {
            if (!playerGuesses[socket.id]) {
                playerGuesses[socket.id] = new Set();
            }
            if (!playerGuesses[socket.id].has(targetPlayerId)) {
                playerGuesses[socket.id].add(targetPlayerId);
                const targetPlayer = players.find(p => p.id === targetPlayerId);
                if (targetPlayer && assignedRoles[targetPlayerId].name === guessedRole) {
                    guessingPlayer.score += 1;
                } else {
                    guessingPlayer.score -= 1;
                }
                io.emit('updateScore', { playerId: guessingPlayer.id, score: guessingPlayer.score });
            } else {
                socket.emit('errorMessage', 'You have already guessed the role for this player.');
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        players = players.filter(player => player.id !== socket.id);
        io.emit('updatePlayers', players);
    });
});

function assignRoles(players) {
    const shuffledRoles = roles.sort(() => 0.5 - Math.random()).slice(0, players.length);
    const assignments = {};
    players.forEach((player, index) => {
        assignments[player.id] = shuffledRoles[index];
    });
    return assignments;
}

function assignRole(playerId) {
    const assignedRole = roles.find(role => !Object.values(assignedRoles).some(ar => ar.name === role.name));
    assignedRoles[playerId] = assignedRole;
    return assignedRole;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

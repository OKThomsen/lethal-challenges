const roles = [
    { name: 'Sheriff', description: 'You are the law enforcer. Each night, you can choose a player to investigate.' },
    { name: 'Doctor', description: 'You can heal one player each night, protecting them from attacks.' },
    { name: 'Investigator', description: 'Each night, you can investigate a player to discover their role.' },
    { name: 'Mafioso', description: 'You are part of the Mafia. Each night, you can choose a player to eliminate.' },
    { name: 'Jester', description: 'Your goal is to get yourself lynched by the town.' }
];

let players = [];
let assignedRoles = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('joinGame', (name) => {
        if (!players.some(player => player.id === socket.id)) {
            players.push({ id: socket.id, name });
            socket.emit('joined', { id: socket.id });
            io.emit('updatePlayers', players);
        }
    });

    socket.on('startGame', () => {
        if (players.length > 0) {
            assignedRoles = assignRoles(players);
            for (const [player, role] of Object.entries(assignedRoles)) {
                io.to(player).emit('roleAssigned', role);
            }
            io.emit('gameStarted');
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

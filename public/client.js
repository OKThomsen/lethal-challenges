const socket = io();

function joinGame() {
    const name = document.getElementById('name').value;
    if (name) {
        socket.emit('joinGame', name);
    }
}

socket.on('joined', ({ id }) => {
    document.getElementById('join').style.display = 'none';
    document.getElementById('waiting').style.display = 'block';
    if (socket.id === id) {
        document.getElementById('gamemaster').style.display = 'block';
    }
});

socket.on('updatePlayers', (players) => {
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = players.map(player => `<p>${player.name}</p>`).join('');
});

function startGame() {
    socket.emit('startGame');
}

socket.on('roleAssigned', (role) => {
    document.getElementById('waiting').style.display = 'none';
    document.getElementById('role').style.display = 'block';
    document.getElementById('roleName').innerText = role.name;
    document.getElementById('roleDescription').innerText = role.description;
});

socket.on('gameStarted', () => {
    document.getElementById('gamemaster').style.display = 'none';
});

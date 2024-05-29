const socket = io();

const roles = [
    { name: 'SEE NO EVIL'},
    { name: 'WILDLIFE SPECIALIST'},
    { name: 'PYROTECHNICS'},
    { name: 'SCARED STRAIGHT'},
    { name: 'BULL RUNNER'},
    { name: 'RESIDENT JOKESTER'},
    { name: 'SABOTAGE'},
    { name: 'EAGER TO LEAVE'},
    { name: 'UNQUALIFIED'},
    { name: 'IMPULSE CONTROL'},
    { name: 'SENTIMENTALITY'},
    { name: 'DANCING WITH DEATH'},
    { name: 'PRIVATE INVESTIGATION'},
    { name: 'PACIFIST'},
    { name: 'SAVIOR'},
    { name: 'SCAREDY CAT'},
    { name: 'DAREDEVIL'},
    { name: 'NEW HIRE'},
    { name: 'GULLIBLE'},
    { name: 'STONE FACED'},
    { name: 'ACROPHOBIA'},
    { name: 'WEAK-ARMED'},
    { name: 'MUSE'},
    { name: 'ENERGY CONSERVATION'},
    { name: 'FINDERS KEEPERS'},
    { name: 'LONE WOLF'},
    { name: 'NO MERCY'},
    { name: 'DONATIONS'}
    // Add more roles here as needed
];

// Sort the roles array alphabetically by name
roles.sort((a, b) => a.name.localeCompare(b.name));

let playerId;

function joinGame() {
    const name = document.getElementById('name').value;
    if (name) {
        socket.emit('joinGame', name);
    }
}

socket.on('joined', ({ id }) => {
    playerId = id;
    document.getElementById('join').style.display = 'none';
    document.getElementById('waiting').style.display = 'block';
});

socket.on('updatePlayers', (players) => {
    const playersDiv = document.getElementById('playersList');
    playersDiv.innerHTML = players.map(player => `
        <div class="player">
            <span class="score" id="score-${player.id}">${player.score || 0}</span>
            <span class="player-name">${player.name}</span>
            ${player.id !== playerId ? `
            <select>
                ${roles.map(role => `<option value="${role.name}">${role.name}</option>`).join('')}
            </select>
            <button onclick="guessRole('${player.id}', this.previousElementSibling.value)">Guess Role</button>
            ` : '<span class="empty-space"></span>'}
        </div>
    `).join('');
});

function startGame() {
    socket.emit('startGame');
}

function reroll() {
    socket.emit('reroll');
}

function guessRole(targetPlayerId, guessedRole) {
    socket.emit('guessRole', { targetPlayerId, guessedRole });
}

socket.on('roleAssigned', (role) => {
    document.getElementById('waiting').style.display = 'none';
    document.getElementById('role').style.display = 'block';
    const roleNameElement = document.getElementById('roleName');
    const roleDescriptionElement = document.getElementById('roleDescription');
  
    const sanitizedRoleName = role.name.replace(/\s/g, '_');
    roleNameElement.className = `roleName ${sanitizedRoleName}`;
    roleNameElement.innerText = role.name;
    roleDescriptionElement.className = `roleDescription ${sanitizedRoleName}`;
    roleDescriptionElement.innerText = role.description;
    
    // Set border color to match text color
    roleDescriptionElement.style.borderColor = roleDescriptionElement.style.color;

    // Show the reroll button if the user is authenticated as the game master
    fetch('/isAuthenticated')
        .then(response => response.json())
        .then(data => {
            if (data.isAuthenticated) {
                document.getElementById('gamemaster-reroll').style.display = 'block';
            }
        });
});

socket.on('gameStarted', () => {
    document.getElementById('gamemaster').style.display = 'none';
});

socket.on('updateScore', ({ playerId, score }) => {
    document.getElementById(`score-${playerId}`).innerText = score;
});

socket.on('errorMessage', (message) => {
    alert(message); // Display the error message to the user
});

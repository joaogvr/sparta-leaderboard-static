let database;

function initFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyCDaOdD62oFnLCY06L29w17sF5MhCV_fvA",
    authDomain: "leaderboard-sparta.firebaseapp.com",
    databaseURL: "https://leaderboard-sparta-default-rtdb.firebaseio.com",
    projectId: "leaderboard-sparta",
    storageBucket: "leaderboard-sparta.appspot.com",
    messagingSenderId: "891532185807",
    appId: "1:891532185807:web:369aac75938e202fe4a7ba"
  };
  const app = firebase.initializeApp(firebaseConfig);
  database = firebase.database();
}

function renderLeaderboard() {
  const container = document.getElementById('leaderboard');
  database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    container.innerHTML = '';

    Object.keys(data).forEach(category => {
      const section = document.createElement('section');
      section.innerHTML = `<h2>${category}</h2>`;
      const ranking = Object.values(data[category])
        .map(team => ({
          name: team.name,
          score: calculateScore(team)
        }))
        .sort((a, b) => b.score - a.score);

      const ol = document.createElement('ol');
      ranking.forEach((team, idx) => {
        const li = document.createElement('li');
        li.textContent = `${idx + 1}. ${team.name} - ${team.score} pts`;
        ol.appendChild(li);
      });

      section.appendChild(ol);
      container.appendChild(section);
    });
  });
}

function renderAdmin() {
  const container = document.getElementById('teamsList');
  database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    container.innerHTML = '';

    Object.entries(data).forEach(([category, teams]) => {
      const catTitle = document.createElement('h3');
      catTitle.textContent = category;
      container.appendChild(catTitle);

      Object.entries(teams).forEach(([id, team]) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <strong>${team.name}</strong><br>
          For Time (min): <input type="number" value="${team.forTime ?? ''}" onchange="updateField('${category}', '${id}', 'forTime', this.value)"><br>
          Carga Máx (kg): <input type="number" value="${team.carga ?? ''}" onchange="updateField('${category}', '${id}', 'carga', this.value)"><br>
          AMRAP (reps): <input type="number" value="${team.amrap ?? ''}" onchange="updateField('${category}', '${id}', 'amrap', this.value)"><br>
          <button onclick="removeTeam('${category}', '${id}')">Remover</button>
        `;
        container.appendChild(card);
      });
    });
  });

  document.getElementById('addForm').onsubmit = function(e) {
    e.preventDefault();
    addTeam();
  };
}

function addTeam() {
  const name = document.getElementById('newTeamName').value.trim();
  const category = document.getElementById('newCategory').value.trim();
  if (!name || !category) return;

  const id = Date.now().toString();
  database.ref(`/${category}/${id}`).set({ name });

  document.getElementById('addForm').reset();
}

function updateField(category, id, field, value) {
  const update = {};
  update[field] = parseFloat(value) || 0;
  database.ref(`/${category}/${id}`).update(update);
}

function removeTeam(category, id) {
  database.ref(`/${category}/${id}`).remove();
}

function calculateScore(team) {
  let score = 0;
  if (team.forTime !== undefined) score += scorePosition('forTime', team.forTime);
  if (team.carga !== undefined) score += scorePosition('carga', team.carga);
  if (team.amrap !== undefined) score += scorePosition('amrap', team.amrap);
  return score;
}

function scorePosition(type, value) {
  if (type === 'forTime') return -value; // menor tempo é melhor
  return value; // maior valor é melhor
}
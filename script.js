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

function setupTabs() {
  database.ref('/times').once('value').then(snapshot => {
    const data = snapshot.val() || {};
    const tabs = document.getElementById('tabs');
    tabs.innerHTML = '';

    Object.keys(data).forEach(category => {
      const tab = document.createElement('div');
      tab.className = 'tab';
      tab.innerText = category;
      tab.onclick = () => renderLeaderboard(category);
      tabs.appendChild(tab);
    });

    const firstTab = document.querySelector('.tab');
    if (firstTab) { firstTab.click(); firstTab.classList.add('active'); }
  });

  database.ref('/provaAtual').on('value', snapshot => {
    document.getElementById('provaAtual').innerText = "Prova Atual: " + (snapshot.val() || "Aguardando Atualização");
  });
}

function renderLeaderboard(category) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  Array.from(document.getElementsByClassName('tab')).find(t => t.innerText === category)?.classList.add('active');

  const container = document.getElementById('leaderboard');
  database.ref(`/times/${category}`).once('value').then(snapshot => {
    const data = snapshot.val() || {};
    container.innerHTML = '<table><thead><tr><th>Dupla</th><th>Box</th><th>Prova 1</th><th>Prova 2</th><th>Prova 3</th><th>Total</th></tr></thead><tbody></tbody></table>';
    const tbody = container.querySelector('tbody');

    const list = Object.values(data).map(team => ({
      ...team,
      total: calculateTotal(team)
    })).sort((a, b) => b.total - a.total);

    list.forEach(team => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${team.name}</td><td>${team.box}</td><td>${team.prova1 ?? ''}</td><td>${team.prova2 ?? ''}</td><td>${team.prova3 ?? ''}</td><td>${team.total}</td>`;
      tbody.appendChild(row);
    });
  });
}

function renderAdmin() {
  const container = document.getElementById('teamsList');
  database.ref('/times').on('value', snapshot => {
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
          <strong>${team.name}</strong> (${team.box})<br>
          Prova 1: <input type="number" value="${team.prova1 ?? ''}" onchange="updateField('${category}', '${id}', 'prova1', this.value)"><br>
          Prova 2: <input type="number" value="${team.prova2 ?? ''}" onchange="updateField('${category}', '${id}', 'prova2', this.value)"><br>
          Prova 3: <input type="number" value="${team.prova3 ?? ''}" onchange="updateField('${category}', '${id}', 'prova3', this.value)"><br>
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

  document.getElementById('provaForm').onsubmit = function(e) {
    e.preventDefault();
    const prova = document.getElementById('provaInput').value.trim();
    if (prova) {
      database.ref('/provaAtual').set(prova);
      document.getElementById('provaForm').reset();
    }
  };
}

function addTeam() {
  const name = document.getElementById('teamName').value.trim();
  const box = document.getElementById('boxName').value.trim();
  const category = document.getElementById('category').value.trim();
  if (!name || !box || !category) return;

  const id = Date.now().toString();
  database.ref(`/times/${category}/${id}`).set({ name, box });

  document.getElementById('addForm').reset();
}

function updateField(category, id, field, value) {
  const update = {};
  update[field] = parseFloat(value) || 0;
  database.ref(`/times/${category}/${id}`).update(update);
}

function removeTeam(category, id) {
  database.ref(`/times/${category}/${id}`).remove();
}

function calculateTotal(team) {
  return (team.prova1 || 0) + (team.prova2 || 0) + (team.prova3 || 0);
}
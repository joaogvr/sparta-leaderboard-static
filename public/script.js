// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCDaOdD62oFnLCY06L29w17sF5MhCV_fvA",
  authDomain: "leaderboard-sparta.firebaseapp.com",
  databaseURL: "https://leaderboard-sparta-default-rtdb.firebaseio.com",
  projectId: "leaderboard-sparta",
  storageBucket: "leaderboard-sparta.appspot.com",
  messagingSenderId: "891532185807",
  appId: "1:891532185807:web:369aac75938e202fe4a7ba"
};

let db;

function initFirebase() {
  const app = firebase.initializeApp(firebaseConfig);
  db = firebase.database();
}

// TABS - para mudar entre categorias
function setupTabs() {
  db.ref("categories").once("value").then(snapshot => {
    const tabs = document.getElementById("tabs");
    tabs.innerHTML = "";
    snapshot.forEach(child => {
      const btn = document.createElement("div");
      btn.className = "tab";
      btn.innerText = child.key;
      btn.onclick = () => renderLeaderboard(child.key);
      tabs.appendChild(btn);
    });
  });
}

// RENDERIZAR LEADERBOARD
function renderLeaderboard(category) {
  const leaderboard = document.getElementById("leaderboard");

  db.ref("categories/" + category + "/teams").once("value").then(snapshot => {
    const teams = [];
    snapshot.forEach(teamSnap => {
      const team = teamSnap.val();
      team.name = teamSnap.key;
      teams.push(team);
    });

    calculateRanking(teams).then(async sorted => {
      // Primeiro pegamos os tipos de prova
      const provasSnapshot = await db.ref("provas").once("value");
      const provasTipos = {};
      provasSnapshot.forEach(child => {
        provasTipos[child.key] = child.val().tipo;
      });

      let html = "<table><thead><tr><th>Dupla</th><th>Box</th>";
      for (let i = 1; i <= 3; i++) {
        html += `<th>P${i} Resultado</th><th>P${i} Rank</th><th>P${i} Pontos</th>`;
      }
      html += "<th>Total</th></tr></thead><tbody>";

      sorted.forEach(t => {
        html += `<tr><td>${t.name}</td><td>${t.box}</td>`;
        for (let i = 1; i <= 3; i++) {
          let result = t['prova'+i]?.resultado ?? '-';
          if (result !== '-' && provasTipos['prova'+i]) {
            const tipo = provasTipos['prova'+i];
            if (tipo === "AMRAP") result += " reps";
            if (tipo === "CARGA") result += " kg";
            // For Time a gente não coloca nada
          }
          html += `<td>${result}</td><td>${t['prova'+i]?.rank ?? '-'}</td><td>${t['prova'+i]?.pontos ?? '-'}</td>`;
        }
        html += `<td>${t.total ?? '-'}</td></tr>`;
      });

      html += "</tbody></table>";
      leaderboard.innerHTML = html;
    });
  });
}


// CALCULAR RANKINGS, PONTOS E TOTAL
async function calculateRanking(teams) {
  const provas = {};
  const snapshot = await db.ref("provas").once("value");
  snapshot.forEach(p => provas[p.key] = p.val());

  for (let prova = 1; prova <= 3; prova++) {
    const tipo = provas['prova'+prova]?.tipo;
    if (!tipo) continue;

    const filtered = teams.filter(t => t['prova'+prova]?.resultado != null);

    filtered.forEach(t => {
      if (tipo === "FOR TIME" && typeof t['prova'+prova].resultado === "string") {
        const parts = t['prova'+prova].resultado.split(':');
        if (parts.length === 2) {
          const minutes = parseInt(parts[0], 10);
          const seconds = parseInt(parts[1], 10);
          t['prova'+prova].resultado_convertido = (minutes * 60) + seconds;
        } else {
          t['prova'+prova].resultado_convertido = parseFloat(t['prova'+prova].resultado);
        }
      } else {
        t['prova'+prova].resultado_convertido = parseFloat(t['prova'+prova].resultado);
      }
    });

    if (tipo === "FOR TIME") {
      filtered.sort((a, b) => a['prova'+prova].resultado_convertido - b['prova'+prova].resultado_convertido);
    } else {
      filtered.sort((a, b) => b['prova'+prova].resultado_convertido - a['prova'+prova].resultado_convertido);
    }

    filtered.forEach((team, index) => {
      team['prova'+prova].rank = index + 1;
      team['prova'+prova].pontos = pontosPorPosicao(index + 1);
    });
  }

  teams.forEach(t => {
    t.total = [1,2,3].reduce((acc, i) => acc + (t['prova'+i]?.pontos ?? 0), 0);
  });

  teams.sort((a, b) => b.total - a.total);
  return teams;
}


// PONTUAÇÃO ESTILO GAMES
function pontosPorPosicao(pos) {
  if (pos === 1) return 100;
  if (pos === 2) return 90;
  if (pos === 3) return 85;
  if (pos === 4) return 80;
  if (pos === 5) return 75;
  if (pos === 6) return 70;
  if (pos === 7) return 65;
  if (pos === 8) return 60;
  if (pos === 9) return 55;
  return 50;
}

// PAINEL DE ADMINISTRAÇÃO
function renderAdmin() {
  const teamsList = document.getElementById("teamsList");

  function loadTeams() {
    db.ref("categories").once("value").then(snapshot => {
      teamsList.innerHTML = "";
      snapshot.forEach(catSnap => {
        const category = catSnap.key;
        catSnap.child("teams").forEach(teamSnap => {
          const team = teamSnap.key;
          const data = teamSnap.val();

          const div = document.createElement("div");
          div.className = "card";
          div.innerHTML = `
            <h3>${team}</h3>
            <p>Box: ${data.box}</p>
            <p>Categoria: ${category}</p>
            <div>
              ${[1,2,3].map(i => `
                <input type="number" id="res-${category}-${team}-p${i}" placeholder="Resultado P${i}" value="${data['prova'+i]?.resultado ?? ''}">
              `).join('')}
              <button onclick="saveResults('${category}', '${team}')">Salvar Resultados</button>
              <button style="background: darkred; margin-top: 5px;" onclick="deleteTeam('${category}', '${team}')">Excluir Dupla</button>
            </div>
          `;
          teamsList.appendChild(div);
        });
      });
    });
  }

window.saveResults = function(category, team) {
  const updates = {};
  for (let i = 1; i <= 3; i++) {
    const val = document.getElementById(`res-${category}-${team}-p${i}`).value;
    if (val) updates[`prova${i}/resultado`] = parseFloat(val);
  }
  db.ref(`categories/${category}/teams/${team}`).update(updates).then(() => {
    alert("Resultados atualizados!");
    loadTeams();
    setupTabs();

    const activeTab = document.querySelector('.tab.active')?.innerText;
    if (activeTab) {
      // Forçar recálculo
      setTimeout(() => {
        renderLeaderboard(activeTab);
      }, 300);
    }
  });
};


  window.deleteTeam = function(category, team) {
    if (confirm(`Deseja remover a dupla "${team}" da categoria "${category}"?`)) {
      db.ref(`categories/${category}/teams/${team}`).remove().then(() => {
        alert("Dupla removida!");
        loadTeams();
      });
    }
  };

  const formAdd = document.getElementById("addForm");
  formAdd.onsubmit = function(e) {
    e.preventDefault();
    const team = document.getElementById("teamName").value.trim();
    const box = document.getElementById("boxName").value.trim();
    const category = document.getElementById("category").value;
    if (!team || !box || !category) return alert("Preencha todos os campos!");

    db.ref(`categories/${category}/teams/${team}`).set({
      box: box
    }).then(() => {
      alert("Dupla adicionada!");
      formAdd.reset();
      loadTeams();
    });
  };

  const formProva = document.getElementById("provaForm");
  formProva.onsubmit = function(e) {
    e.preventDefault();
    const provaNome = document.getElementById("provaInput").value.trim();
    const tipo = document.getElementById("tipoProvaInput").value;
    if (!provaNome || !tipo) return alert("Preencha o nome e tipo da prova!");

    const id = `prova${Date.now()}`;
    db.ref(`provas/${id}`).set({
      nome: provaNome,
      tipo: tipo
    }).then(() => {
      alert("Prova adicionada!");
      formProva.reset();
    });
  };

  loadTeams();
}

// RENDERIZAR WORKOUTS
function renderWorkouts() {
  const workoutsList = document.getElementById("workoutsList");
  db.ref("provas").once("value").then(snapshot => {
    workoutsList.innerHTML = "";
    snapshot.forEach(child => {
      const data = child.val();
      const div = document.createElement("div");
      div.className = "workout";
      div.innerHTML = `<h2>${data.nome}</h2><p>Tipo: ${data.tipo}</p>`;
      workoutsList.appendChild(div);
    });
  });
}

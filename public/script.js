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

// Pontuação padrão
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

// TABS
function setupTabs() {
  db.ref("categories").once("value").then(snapshot => {
    const tabs = document.getElementById("tabs");
    tabs.innerHTML = "";

    snapshot.forEach(child => {
      const btn = document.createElement("div");
      btn.className = "tab";
      btn.innerText = child.key;
      btn.onclick = () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        renderLeaderboard(child.key);
      };
      tabs.appendChild(btn);
    });

    // Ranking Geral
    const geral = document.createElement("div");
    geral.className = "tab";
    geral.innerText = "🏆 Geral";
    geral.onclick = () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      geral.classList.add("active");
      renderGeral();
    };
    tabs.appendChild(geral);
  });
}

// RANKING GERAL
function renderGeral() {
  db.ref("categories").once("value").then(snapshot => {
    const all = [];
    snapshot.forEach(catSnap => {
      catSnap.child("teams").forEach(teamSnap => {
        const team = teamSnap.val();
        team.name = teamSnap.key;
        team.category = catSnap.key;
        all.push(team);
      });
    });
    calculateRanking(all).then(teams => {
      let html = "<table><thead><tr><th>Dupla</th><th>Box</th><th>Categoria</th>";
      for (let i = 1; i <= 3; i++) {
        html += <th>P${i} Resultado</th><th>P${i} Rank</th><th>P${i} Pontos</th>;
      }
      html += "<th>Total</th></tr></thead><tbody>";
      teams.forEach((t, i) => {
        const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
        html += <tr><td>${medalha} ${t.name}</td><td>${t.box}</td><td>${t.category}</td>;
        for (let p = 1; p <= 3; p++) {
          html += <td>${t['prova'+p]?.resultado ?? '-'}</td><td>${t['prova'+p]?.rank ?? '-'}</td><td>${t['prova'+p]?.pontos ?? '-'}</td>;
        }
        html += <td>${t.total ?? '-'}</td></tr>;
      });
      html += "</tbody></table>";
      document.getElementById("leaderboard").innerHTML = html;
    });
  });
}

// RENDER LEADERBOARD
function renderLeaderboard(category) {
  const leaderboard = document.getElementById("leaderboard");

  db.ref("categories/" + category + "/teams").once("value").then(snapshot => {
    const teams = [];
    snapshot.forEach(teamSnap => {
      const team = teamSnap.val();
      team.name = teamSnap.key;
      team.category = category;
      teams.push(team);
    });

    calculateRanking(teams).then(sorted => {
      db.ref("provas").once("value").then(snapshot => {
        const tipos = {};
        snapshot.forEach(child => tipos[child.key] = child.val().tipo);

        let html = "<table><thead><tr><th>Dupla</th><th>Box</th>";
        for (let i = 1; i <= 3; i++) {
          html += `<th>P${i} Resultado</th><th>P${i} Rank</th><th>P${i} Pontos</th>`;
        }
        html += "<th>Total</th></tr></thead><tbody>";

        sorted.forEach(t => {
          html += `<tr><td>${t.name}</td><td>${t.box}</td>`;
          for (let i = 1; i <= 3; i++) {
            let r = t['prova'+i]?.resultado ?? '-';
            const tipo = tipos['prova'+i];
            if (r !== '-' && tipo) {
              if (tipo === "AMRAP") r += " reps";
              else if (tipo === "CARGA") r += " kg";
              else if (tipo === "FOR TIME" && typeof r === "number") {
                const min = Math.floor(r / 60);
                const sec = String(r % 60).padStart(2, '0');
                r = ${min}:${sec};
              }
            }
            html += <td>${r}</td><td>${t['prova'+i]?.rank ?? '-'}</td><td>${t['prova'+i]?.pontos ?? '-'}</td>;
          }
          html += <td>${t.total ?? '-'}</td></tr>;
        });

        html += "</tbody></table>";
        leaderboard.innerHTML = html;
      });
    });
  });
}

// CALCULAR RANKS
async function calculateRanking(teams) {
  const snapshot = await db.ref("provas").once("value");
  const provas = {};
  snapshot.forEach(p => provas[p.key] = p.val());

  for (let prova = 1; prova <= 3; prova++) {
    const tipo = provas['prova' + prova]?.tipo;
    if (!tipo) continue;

    const filtrados = teams.filter(t => t['prova' + prova]?.resultado != null);

    filtrados.forEach(t => {
      const res = t['prova' + prova].resultado;
      let convertido;

      if (tipo === "FOR TIME" && typeof res === "string" && res.includes(":")) {
        const [min, sec] = res.split(":").map(Number);
        convertido = min * 60 + sec;
      } else {
        convertido = parseFloat(res);
      }

      t['prova' + prova].resultado_convertido = convertido;
    });

    filtrados.sort((a, b) => 
      tipo === "FOR TIME"
        ? a['prova' + prova].resultado_convertido - b['prova' + prova].resultado_convertido
        : b['prova' + prova].resultado_convertido - a['prova' + prova].resultado_convertido
    );

    filtrados.forEach((team, i) => {
      team['prova' + prova].rank = i + 1;
      team['prova' + prova].pontos = pontosPorPosicao(i + 1);
      db.ref(categories/${team.category}/teams/${team.name}/prova${prova}).update({
        rank: i + 1,
        pontos: team['prova' + prova].pontos
      });
    });
  }

  teams.forEach(t => {
    t.total = [1, 2, 3].reduce((sum, i) => sum + (t['prova' + i]?.pontos ?? 0), 0);
    db.ref(categories/${t.category}/teams/${t.name}).update({ total: t.total });
  });

  teams.sort((a, b) => b.total - a.total);
  return teams;
}


// ADMIN
function renderAdmin() {
  const teamsList = document.getElementById("teamsList");

  function loadTeams() {
    db.ref("categories").once("value").then(snapshot => {
      teamsList.innerHTML = "";
      snapshot.forEach(cat => {
        const category = cat.key;
        cat.child("teams").forEach(ts => {
          const team = ts.key;
          const data = ts.val();
          const div = document.createElement("div");
          div.className = "card";
          div.innerHTML = `
            <h3>${team}</h3><p>${data.box} (${category})</p>
            ${[1,2,3].map(i =>
              <input type="text" id="res-${category}-${team}-p${i}" value="${data['prova'+i]?.resultado ?? ''}" placeholder="Resultado P${i}">
            ).join('')}
            <button onclick="saveResults('${category}', '${team}')">Salvar</button>
            <button onclick="deleteTeam('${category}', '${team}')" style="background: darkred;">Excluir</button>
          `;
          teamsList.appendChild(div);
        });
      });
    });
  }

window.saveResults = async function(category, team) {
  const updates = {};
  const provasSnap = await db.ref("provas").once("value");
  const tipos = {};
  provasSnap.forEach(p => tipos[p.key] = p.val().tipo);

  for (let i = 1; i <= 3; i++) {
    const input = document.getElementById(res-${category}-${team}-p${i});
    if (!input) continue;

    const val = input.value.trim();
    if (val !== "") {
      const tipo = tipos['prova' + i];

      if (tipo === "FOR TIME") {
        updates[prova${i}/resultado] = val; // salva como string ex: "05:22"
      } else {
        const parsed = parseFloat(val.replace(",", "."));
        if (!isNaN(parsed)) {
          updates[prova${i}/resultado] = parsed;
        }
      }
    }
  }

  await db.ref(categories/${category}/teams/${team}).update(updates);

  const snap = await db.ref(categories/${category}/teams).once("value");
  const teams = [];
  snap.forEach(ts => {
    const t = ts.val();
    t.name = ts.key;
    t.category = category;
    teams.push(t);
  });

  await calculateRanking(teams);
  alert("Resultado salvo com sucesso!");
  renderAdmin(true);
};



  window.deleteTeam = function(category, team) {
    if (confirm(Remover ${team}?)) {
      db.ref(categories/${category}/teams/${team}).remove().then(loadTeams);
    }
  };

  document.getElementById("addForm").onsubmit = e => {
    e.preventDefault();
    const team = document.getElementById("teamName").value.trim();
    const box = document.getElementById("boxName").value.trim();
    const cat = document.getElementById("category").value;
    if (!team || !box || !cat) return alert("Preencha todos os campos");
    db.ref(categories/${cat}/teams/${team}).set({ box }).then(() => {
      alert("Dupla adicionada");
      e.target.reset();
      loadTeams();
    });
  };

  document.getElementById("provaForm").onsubmit = e => {
    e.preventDefault();
    const nome = document.getElementById("provaInput").value.trim();
    const tipo = document.getElementById("tipoProvaInput").value;
    if (!nome || !tipo) return alert("Preencha tudo");
    const id = prova${Date.now()};
    db.ref(provas/${id}).set({ nome, tipo }).then(() => {
      alert("Prova cadastrada");
      e.target.reset();
    });
  };

  loadTeams();
}

// WORKOUTS
function renderWorkouts() {
  const workoutsList = document.getElementById("workoutsList");
  db.ref("provas").once("value").then(snapshot => {
    workoutsList.innerHTML = "";
    snapshot.forEach(p => {
      const d = p.val();
      const div = document.createElement("div");
      div.className = "workout";
      div.innerHTML = <h2>${d.nome}</h2><p>Tipo: ${d.tipo}</p>;
      workoutsList.appendChild(div);
    });
  });
}

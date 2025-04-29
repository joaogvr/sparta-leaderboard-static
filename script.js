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

function renderLeaderboard(category) {
  const leaderboard = document.getElementById("leaderboard");
  db.ref("categories/" + category + "/teams").once("value").then(snapshot => {
    const teams = [];
    snapshot.forEach(teamSnap => {
      const team = teamSnap.val();
      team.name = teamSnap.key;
      teams.push(team);
    });
    calculateRanking(teams).then(sorted => {
      let html = "<table><thead><tr><th>Dupla</th><th>Box</th>";
      for (let i = 1; i <= 3; i++) {
        html += `<th>P${i} Resultado</th><th>Rank</th><th>Pontos</th>`;
      }
      html += "<th>Total</th></tr></thead><tbody>";
      sorted.forEach(t => {
        html += `<tr><td>${t.name}</td><td>${t.box}</td>`;
        for (let i = 1; i <= 3; i++) {
          html += `<td>${t['prova'+i]?.resultado ?? '-'}</td><td>${t['prova'+i]?.rank ?? '-'}</td><td>${t['prova'+i]?.pontos ?? '-'}</td>`;
        }
        html += `<td>${t.total ?? '-'}</td></tr>`;
      });
      html += "</tbody></table>";
      leaderboard.innerHTML = html;
    });
  });
}

async function calculateRanking(teams) {
  const provas = {};
  const snapshot = await db.ref("provas").once("value");
  snapshot.forEach(p => provas[p.key] = p.val());

  for (let prova = 1; prova <= 3; prova++) {
    const tipo = provas['prova'+prova]?.tipo;
    if (!tipo) continue;
    const filtered = teams.filter(t => t['prova'+prova]?.resultado != null);
    if (tipo === "FOR TIME") filtered.sort((a, b) => a['prova'+prova].resultado - b['prova'+prova].resultado);
    else filtered.sort((a, b) => b['prova'+prova].resultado - a['prova'+prova].resultado);

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

function renderAdmin() {
  // Simplesmente placeholder aqui
}

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
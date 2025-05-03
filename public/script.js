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

// Inicializar Firebase
function initFirebase() {
  const app = firebase.initializeApp(firebaseConfig);
  db = firebase.database();
}

// Função para carregar a página de administração
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
            ${[1, 2, 3].map(i =>
              `<input type="text" id="res-${category}-${team}-p${i}" value="${data['prova' + i]?.resultado ?? ''}" placeholder="Resultado P${i} (Ex: 02:54 ou 100kg ou reps)">`
            ).join('')}
            <div class="btns">
              <button onclick="saveResults('${category}', '${team}')">Salvar</button>
              <button onclick="deleteTeam('${category}', '${team}')" style="background: darkred;">Excluir</button>
            </div>
          `;
          teamsList.appendChild(div);
        });
      });
    });
  }

  // Função para salvar resultados
  window.saveResults = async function (category, team) {
    const updates = {};
    const provasSnap = await db.ref("provas").once("value");
    const tipos = {};
    provasSnap.forEach(p => tipos[p.key] = p.val().tipo);

    for (let i = 1; i <= 3; i++) {
      const input = document.getElementById(`res-${category}-${team}-p${i}`);
      if (!input) continue;

      const val = input.value.trim();
      if (val !== "") {
        const tipo = tipos['prova' + i];

        if (tipo === "FOR TIME") {
          // Tratar entrada de tempo no formato MM:SS
          const timeParts = val.split(":").map(Number);
          if (timeParts.length === 2) {
            const seconds = timeParts[0] * 60 + timeParts[1]; // Converter minutos e segundos para segundos totais
            updates[`prova${i}/resultado`] = seconds; // Salvar o tempo em segundos no Firebase
          } else {
            alert(`Por favor, insira um tempo válido no formato MM:SS para a Prova ${i}`);
            return;
          }
        } else {
          // Tratar entradas numéricas para outros tipos de provas
          const parsed = parseFloat(val.replace(",", "."));
          if (!isNaN(parsed)) {
            updates[`prova${i}/resultado`] = parsed;
          } else {
            alert(`Por favor, insira um valor válido para a Prova ${i}`);
            return;
          }
        }
      }
    }

    await db.ref(`categories/${category}/teams/${team}`).update(updates);

    const snap = await db.ref(`categories/${category}/teams`).once("value");
    const teams = [];
    snap.forEach(ts => {
      const t = ts.val();
      t.name = ts.key;
      t.category = category;
      teams.push(t);
    });

    await calculateRanking(teams);
    alert("Resultado salvo com sucesso!");
    loadTeams();
  };

  // Função para deletar equipe
  window.deleteTeam = function (category, team) {
    if (confirm(`Remover ${team}?`)) {
      db.ref(`categories/${category}/teams/${team}`).remove().then(loadTeams);
    }
  };

  // Adicionar nova equipe
  document.getElementById("addForm").onsubmit = e => {
    e.preventDefault();
    const team = document.getElementById("teamName").value.trim();
    const box = document.getElementById("boxName").value.trim();
    const cat = document.getElementById("category").value;
    if (!team || !box || !cat) return alert("Preencha todos os campos");
    db.ref(`categories/${cat}/teams/${team}`).set({ box }).then(() => {
      alert("Dupla adicionada");
      e.target.reset();
      loadTeams();
    });
  };

  // Adicionar nova prova
  document.getElementById("provaForm").onsubmit = e => {
    e.preventDefault();
    const nome = document.getElementById("provaInput").value.trim();
    const tipo = document.getElementById("tipoProvaInput").value;
    if (!nome || !tipo) return alert("Preencha tudo");
    const id = `prova${Date.now()}`;
    db.ref(`provas/${id}`).set({ nome, tipo }).then(() => {
      alert("Prova cadastrada");
      e.target.reset();
    });
  };

  loadTeams();
}

// Função para calcular o ranking
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
      t['prova' + prova].resultado_convertido = tipo === "FOR TIME" ? res : parseFloat(res);
    });

    filtrados.sort((a, b) =>
      tipo === "FOR TIME"
        ? a['prova' + prova].resultado_convertido - b['prova' + prova].resultado_convertido
        : b['prova' + prova].resultado_convertido - a['prova' + prova].resultado_convertido
    );

    filtrados.forEach((team, i) => {
      team['prova' + prova].rank = i + 1;
      team['prova' + prova].pontos = pontosPorPosicao(i + 1);
      db.ref(`categories/${team.category}/teams/${team.name}/prova${prova}`).update({
        rank: i + 1,
        pontos: team['prova' + prova].pontos
      });
    });
  }

  teams.forEach(t => {
    t.total = [1, 2, 3].reduce((sum, i) => sum + (t['prova' + i]?.pontos ?? 0), 0);
    db.ref(`categories/${t.category}/teams/${t.name}`).update({ total: t.total });
  });

  teams.sort((a, b) => b.total - a.total);
  return teams;
}

// Pontuação por posição
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

// Inicialização ao carregar a página
window.onload = function () {
  initFirebase();
  renderAdmin();
};

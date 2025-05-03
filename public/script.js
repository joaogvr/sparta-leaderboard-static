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

// Função para converter mm:ss para segundos
function convertToSeconds(time) {
  const parts = time.split(":");
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return parseFloat(time); // Caso não seja mm:ss, retorna o valor original como número
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
              `<input type="text" id="res-${category}-${team}-p${i}" 
                value="${data['prova' + i]?.resultado ?? ''}" 
                placeholder="Resultado P${i} (Ex: 02:54, 100kg, reps)">`
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
        updates[`prova${i}/resultado`] = val;
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

    await calculateRanking(teams, category);
    alert("Resultado salvo com sucesso!");
    loadTeams();
  };

  // Função para deletar equipe
  window.deleteTeam = function (category, team) {
    if (confirm(`Remover ${team}?`)) {
      db.ref(`categories/${category}/teams/${team}`).remove().then(loadTeams);
    }
  };

  // Função para calcular o ranking e os pontos
  async function calculateRanking(teams, category) {
    const snapshot = await db.ref("provas").once("value");
    const provas = {};
    snapshot.forEach(p => provas[p.key] = p.val());

    for (let prova = 1; prova <= 3; prova++) {
      const tipo = provas[`prova${prova}`]?.tipo;
      if (!tipo) continue;

      const filtrados = teams.filter(t => t[`prova${prova}`]?.resultado != null);

      filtrados.forEach(t => {
        const resultado = t[`prova${prova}`]?.resultado || "0";
        t[`prova${prova}`].resultado_convertido = /^\d{2}:\d{2}$/.test(resultado)
          ? convertToSeconds(resultado) // Converte mm:ss para segundos
          : parseFloat(resultado); // Usa o valor diretamente se não for mm:ss
      });

      // Ordenar os resultados (menor é melhor para tempo)
      filtrados.sort((a, b) =>
        a[`prova${prova}`].resultado_convertido - b[`prova${prova}`].resultado_convertido
      );

      filtrados.forEach((team, i) => {
        const rank = i + 1;
        const pontos = pontosPorPosicao(rank);

        db.ref(`categories/${category}/teams/${team.name}/prova${prova}`).update({
          rank,
          pontos
        });
      });
    }
  }

  // Função para calcular os pontos por posição
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

  loadTeams();
}

// Inicializar ao carregar a página
window.onload = function () {
  initFirebase();
  renderAdmin();
};

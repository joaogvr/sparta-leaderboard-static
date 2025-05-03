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
  return parseFloat(time); // Caso não seja mm:ss, retorna como número
}

// Função para calcular o ranking e os pontos
async function calculateRanking(category) {
  const teamsSnapshot = await db.ref(`categories/${category}/teams`).once("value");
  const teams = [];
  teamsSnapshot.forEach(teamSnap => {
    const team = teamSnap.val();
    team.name = teamSnap.key;
    teams.push(team);
  });

  const provas = [1, 2, 3]; // Provas para processar
  provas.forEach(prova => {
    const teamsWithResults = teams.filter(team => team[`prova${prova}`]?.resultado != null);

    // Converter resultados para segundos ou manter como número
    teamsWithResults.forEach(team => {
      const resultado = team[`prova${prova}`].resultado;
      team[`prova${prova}`].resultado_convertido = /^\d{2}:\d{2}$/.test(resultado)
        ? convertToSeconds(resultado) // Converte mm:ss para segundos
        : parseFloat(resultado); // Usa o valor diretamente se não for mm:ss
    });

    // Ordenar por resultado (menor é melhor para tempo)
    teamsWithResults.sort((a, b) =>
      a[`prova${prova}`].resultado_convertido - b[`prova${prova}`].resultado_convertido
    );

    // Atribuir rank e pontos
    teamsWithResults.forEach((team, index) => {
      const rank = index + 1;
      const pontos = pontosPorPosicao(rank);

      // Atualizar no Firebase
      db.ref(`categories/${category}/teams/${team.name}/prova${prova}`).update({
        rank,
        pontos
      });
    });
  });
}

// Função para calcular os pontos com base na posição
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

// Função para salvar resultados de uma equipe
async function saveResults(category, teamName) {
  const updates = {};
  for (let i = 1; i <= 3; i++) {
    const input = document.getElementById(`res-${category}-${teamName}-p${i}`);
    if (!input) continue;

    const val = input.value.trim();
    if (val !== "") {
      updates[`prova${i}/resultado`] = val;
    }
  }

  // Atualizar resultados no Firebase
  await db.ref(`categories/${category}/teams/${teamName}`).update(updates);

  // Recalcular rankings e pontos
  await calculateRanking(category);

  alert("Resultado salvo com sucesso!");
}

// Função para carregar a interface de administração
function renderAdmin() {
  const teamsList = document.getElementById("teamsList");

  function loadTeams() {
    db.ref("categories").once("value").then(snapshot => {
      teamsList.innerHTML = "";
      snapshot.forEach(cat => {
        const category = cat.key;
        cat.child("teams").forEach(teamSnap => {
          const team = teamSnap.key;
          const data = teamSnap.val();
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

  // Função para deletar uma equipe
  window.deleteTeam = function (category, team) {
    if (confirm(`Remover ${team}?`)) {
      db.ref(`categories/${category}/teams/${team}`).remove().then(loadTeams);
    }
  };

  loadTeams();
}

// Inicializar ao carregar a página
window.onload = function () {
  initFirebase();
  renderAdmin();
};

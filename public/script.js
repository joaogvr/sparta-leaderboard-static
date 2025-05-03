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

// Configurar os tabs de categorias
function setupTabs() {
  const tabsDiv = document.getElementById("tabs");
  db.ref("categories").once("value").then(snapshot => {
    tabsDiv.innerHTML = ""; // Limpa tabs existentes
    snapshot.forEach(category => {
      const categoryName = category.key;
      const tab = document.createElement("div");
      tab.className = "tab";
      tab.textContent = categoryName;
      tab.onclick = () => renderLeaderboard(categoryName);
      tabsDiv.appendChild(tab);
    });

    // Ativar o primeiro tab por padrão
    if (tabsDiv.firstChild) {
      tabsDiv.firstChild.classList.add("active");
      renderLeaderboard(snapshot.val() ? Object.keys(snapshot.val())[0] : null);
    }
  });
}

// Renderizar o leaderboard para uma categoria
function renderLeaderboard(category) {
  if (!category) return;

  const leaderboardDiv = document.getElementById("leaderboard");
  db.ref(`categories/${category}/teams`).once("value").then(snapshot => {
    const teams = snapshot.val();
    if (!teams) {
      leaderboardDiv.innerHTML = "<p>Nenhum dado encontrado.</p>";
      return;
    }

    // Cabeçalho da tabela
    let table = `<table>
      <thead>
        <tr>
          <th>Dupla</th>
          <th>Box</th>
          <th>P1 Resultado</th>
          <th>P1 Rank</th>
          <th>P1 Pontos</th>
          <th>P2 Resultado</th>
          <th>P2 Rank</th>
          <th>P2 Pontos</th>
          <th>P3 Resultado</th>
          <th>P3 Rank</th>
          <th>P3 Pontos</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>`;
    
    // Preenchendo os dados da tabela
    Object.entries(teams).forEach(([teamName, teamData]) => {
      table += `<tr>
        <td>${teamName}</td>
        <td>${teamData.box || '-'}</td>
        <td>${teamData.prova1?.resultado || '-'}</td>
        <td>${teamData.prova1?.rank || '-'}</td>
        <td>${teamData.prova1?.pontos || '-'}</td>
        <td>${teamData.prova2?.resultado || '-'}</td>
        <td>${teamData.prova2?.rank || '-'}</td>
        <td>${teamData.prova2?.pontos || '-'}</td>
        <td>${teamData.prova3?.resultado || '-'}</td>
        <td>${teamData.prova3?.rank || '-'}</td>
        <td>${teamData.prova3?.pontos || '-'}</td>
        <td>${teamData.total || '-'}</td>
      </tr>`;
    });

    table += `</tbody></table>`;
    leaderboardDiv.innerHTML = table;

    // Marcar o tab como ativo
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
    Array.from(document.querySelectorAll(".tab")).find(tab => tab.textContent === category).classList.add("active");
  }).catch(err => {
    console.error("Erro ao buscar dados:", err);
    leaderboardDiv.innerHTML = "<p>Erro ao carregar leaderboard.</p>";
  });
}

// Função para adicionar uma nova dupla
function addTeam() {
  const teamNameInput = document.getElementById("team-name");
  const boxInput = document.getElementById("team-box");
  const categorySelect = document.getElementById("team-category");

  // Verificar se os campos estão preenchidos
  const teamName = teamNameInput.value.trim();
  const box = boxInput.value.trim();
  const category = categorySelect.value;

  if (!teamName || !box || !category) {
    alert("Por favor, preencha todos os campos para adicionar uma nova dupla.");
    return;
  }

  // Dados iniciais para a nova dupla
  const newTeamData = {
    box,
    prova1: { resultado: "", rank: null, pontos: null },
    prova2: { resultado: "", rank: null, pontos: null },
    prova3: { resultado: "", rank: null, pontos: null },
    total: 0
  };

  // Adicionar ao Firebase
  db.ref(`categories/${category}/teams/${teamName}`)
    .set(newTeamData)
    .then(() => {
      alert("Dupla adicionada com sucesso!");
      teamNameInput.value = ""; // Limpar o campo de entrada
      boxInput.value = ""; // Limpar o campo de entrada
      renderAdmin(); // Recarregar a lista de equipes
    })
    .catch(err => {
      console.error("Erro ao adicionar nova dupla:", err);
      alert("Ocorreu um erro ao adicionar a nova dupla. Verifique o console para mais detalhes.");
    });
}

// Salvar resultados de uma equipe
function saveResults(category, teamName) {
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
  db.ref(`categories/${category}/teams/${teamName}`).update(updates).then(() => {
    // Recalcular rankings e pontos
    calculateRanking(category);
    alert("Resultado salvo com sucesso!");
  }).catch(err => console.error("Erro ao salvar resultados:", err));
}

// Renderizar interface de administração
function renderAdmin() {
  const teamsList = document.getElementById("teamsList");

  function loadTeams() {
    db.ref("categories").once("value").then(snapshot => {
      teamsList.innerHTML = "";
      snapshot.forEach(cat => {
        const category = cat.key;

        // Listar equipes existentes
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
  setupTabs();
  renderAdmin();
};

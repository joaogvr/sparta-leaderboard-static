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

    // Transformar os dados em uma lista e calcular o total
    const teamList = Object.entries(teams).map(([teamName, teamData]) => {
      const total = 
        (teamData.prova1?.pontos || 0) +
        (teamData.prova2?.pontos || 0) +
        (teamData.prova3?.pontos || 0);
      return { teamName, ...teamData, total };
    });

    // Ordenar a lista pelo total em ordem decrescente
    teamList.sort((a, b) => b.total - a.total);

    // Cabeçalho da tabela
    let table = `<table>
      <thead>
        <tr>
          <th>Rank</th>
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
    teamList.forEach((team, index) => {
      table += `<tr>
        <td>${index + 1}</td>
        <td>${team.teamName}</td>
        <td>${team.box || '-'}</td>
        <td>${team.prova1?.resultado || '-'}</td>
        <td>${team.prova1?.rank || '-'}</td>
        <td>${team.prova1?.pontos || '-'}</td>
        <td>${team.prova2?.resultado || '-'}</td>
        <td>${team.prova2?.rank || '-'}</td>
        <td>${team.prova2?.pontos || '-'}</td>
        <td>${team.prova3?.resultado || '-'}</td>
        <td>${team.prova3?.rank || '-'}</td>
        <td>${team.prova3?.pontos || '-'}</td>
        <td>${team.total}</td>
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

// Adicionar uma nova dupla
function addTeam(event) {
  event.preventDefault(); // Previne o reload da página

  const teamNameInput = document.getElementById("teamName");
  const boxNameInput = document.getElementById("boxName");
  const categorySelect = document.getElementById("category");

  const teamName = teamNameInput.value.trim();
  const box = boxNameInput.value.trim();
  const category = categorySelect.value;

  if (!teamName || !box || !category) {
    alert("Por favor, preencha todos os campos para adicionar uma nova dupla.");
    return;
  }

  const newTeamData = {
    box,
    prova1: { resultado: "", rank: null, pontos: null },
    prova2: { resultado: "", rank: null, pontos: null },
    prova3: { resultado: "", rank: null, pontos: null },
    total: 0
  };

  db.ref(`categories/${category}/teams/${teamName}`)
    .set(newTeamData)
    .then(() => {
      alert("Dupla adicionada com sucesso!");
      teamNameInput.value = ""; // Limpa o campo de entrada
      boxNameInput.value = ""; // Limpa o campo de entrada
      renderAdmin(); // Atualiza a lista de equipes
    })
    .catch((err) => {
      console.error("Erro ao adicionar nova dupla:", err);
      alert("Ocorreu um erro ao adicionar a nova dupla. Verifique o console para mais detalhes.");
    });
}

// Renderizar interface de administração
function renderAdmin(initialLoad = false) {
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

  if (initialLoad) {
    document.getElementById("addForm").addEventListener("submit", addTeam);
    document.getElementById("provaForm").addEventListener("submit", addProva);
  }

  loadTeams();
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

  db.ref(`categories/${category}/teams/${teamName}`)
    .update(updates)
    .then(() => {
      calculateRanking(category);
      alert("Resultado salvo com sucesso!");
    })
    .catch(err => console.error("Erro ao salvar resultados:", err));
}

// Inicializar ao carregar a página
window.onload = function () {
  initFirebase();
  setupTabs();
  renderAdmin(true);
};

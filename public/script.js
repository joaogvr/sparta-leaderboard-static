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

    // Transformar os dados em uma lista
    const teamList = Object.entries(teams).map(([teamName, teamData]) => {
      return { teamName, ...teamData };
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
        <td>${team.total || 0}</td>
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
function renderAdmin() {
  const teamsList = document.getElementById("teamsList");

  // Limpar a lista antes de renderizar novamente
  teamsList.innerHTML = "";

  // Buscar categorias e equipes no Firebase
  db.ref("categories").once("value").then(snapshot => {
    if (!snapshot.exists()) {
      teamsList.innerHTML = "<p>Nenhuma dupla encontrada.</p>";
      return;
    }

    snapshot.forEach(categorySnap => {
      const category = categorySnap.key;

      // Verificar se existem equipes na categoria
      const teams = categorySnap.child("teams");
      if (!teams.exists()) return;

      teams.forEach(teamSnap => {
        const teamName = teamSnap.key;
        const teamData = teamSnap.val();

        // Criar um card para cada equipe
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
          <h3>${teamName}</h3>
          <p>${teamData.box} (${category})</p>
          ${[1, 2, 3]
            .map(
              prova =>
                `<input type="text" id="res-${category}-${teamName}-p${prova}" 
                  value="${teamData[`prova${prova}`]?.resultado || ""}" 
                  placeholder="Resultado P${prova} (Ex: 02:54, 100kg, reps)">`
            )
            .join("")}
          <div class="btns">
            <button onclick="saveResults('${category}', '${teamName}')">Salvar</button>
            <button onclick="deleteTeam('${category}', '${teamName}')" style="background: darkred;">Excluir</button>
          </div>
        `;

        teamsList.appendChild(card);
      });
    });
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

  db.ref(`categories/${category}/teams/${teamName}`)
    .update(updates)
    .then(() => {
      calculateRanking(category);
      alert("Resultados salvos com sucesso!");
      renderAdmin(); // Atualiza a lista de equipes
    })
    .catch(err => console.error("Erro ao salvar resultados:", err));
}

// Excluir uma equipe
function deleteTeam(category, teamName) {
  if (!confirm(`Tem certeza que deseja excluir a dupla "${teamName}" da categoria "${category}"?`)) return;

  db.ref(`categories/${category}/teams/${teamName}`)
    .remove()
    .then(() => {
      alert("Dupla excluída com sucesso!");
      renderAdmin(); // Atualiza a lista de equipes
    })
    .catch(err => console.error("Erro ao excluir a dupla:", err));
}

// Calcular o ranking e pontos
function calculateRanking(category) {
  db.ref(`categories/${category}/teams`).once("value").then(snapshot => {
    const teams = [];
    snapshot.forEach(teamSnap => {
      const team = teamSnap.val();
      team.name = teamSnap.key;
      teams.push(team);
    });

    const provas = [1, 2, 3];
    provas.forEach(prova => {
      db.ref(`provas/prova${prova}`).once("value").then(provaSnapshot => {
        const provaType = provaSnapshot.val()?.tipo; // Tipo da prova
        const teamsWithResults = teams.filter(team => team[`prova${prova}`]?.resultado != null);

        // Converter resultados para segundos ou deixar como está
        teamsWithResults.forEach(team => {
          const resultado = team[`prova${prova}`]?.resultado;
          team[`prova${prova}`].resultado_convertido = /^\d{2}:\d{2}$/.test(resultado)
            ? convertToSeconds(resultado) // Converte mm:ss para segundos
            : parseFloat(resultado); // Usa o valor diretamente se não for mm:ss
        });

        // Ordenar os resultados com base no tipo da prova
        if (provaType === "FOR TIME") {
          // Menor é melhor
          teamsWithResults.sort((a, b) =>
            a[`prova${prova}`].resultado_convertido - b[`prova${prova}`].resultado_convertido
          );
        } else if (provaType === "CARGA" || provaType === "AMRAP") {
          // Maior é melhor
          teamsWithResults.sort((a, b) =>
            b[`prova${prova}`].resultado_convertido - a[`prova${prova}`].resultado_convertido
          );
        }

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
      }).catch(err => console.error(`Erro ao buscar tipo da prova ${prova}:`, err));
    });
  }).catch(err => console.error("Erro ao calcular ranking:", err));
}

// Retornar pontos com base no rank
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


// Inicializar ao carregar a página
window.onload = function () {
  initFirebase();
  setupTabs();
  renderAdmin();
};

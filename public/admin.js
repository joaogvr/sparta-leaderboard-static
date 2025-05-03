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

// Adicionar uma nova dupla
function addTeam(event) {
  event.preventDefault(); // Previne o reload da página

  const teamNameInput = document.getElementById("teamName");
  const boxNameInput = document.getElementById("boxName");
  const categorySelect = document.getElementById("category");

  const teamName = teamNameInput.value.trim();
  const boxName = boxNameInput.value.trim();
  const category = categorySelect.value;

  // Verificar se todos os campos foram preenchidos
  if (!teamName || !boxName || !category) {
    alert("Por favor, preencha todos os campos para adicionar uma nova dupla.");
    return;
  }

  const newTeamData = {
    box: boxName,
    prova1: { resultado: "", rank: null, pontos: null },
    prova2: { resultado: "", rank: null, pontos: null },
    prova3: { resultado: "", rank: null, pontos: null },
    total: 0
  };

  // Salvar a nova dupla no Firebase
  db.ref(`categories/${category}/teams/${teamName}`)
    .set(newTeamData)
    .then(() => {
      alert("Dupla adicionada com sucesso!");
      teamNameInput.value = ""; // Limpar o campo de input
      boxNameInput.value = ""; // Limpar o campo de input
      renderAdmin(); // Atualizar a lista de duplas
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

  db.ref(`categories/${category}/teams/${teamName}`)
    .update(updates)
    .then(() => {
      calculateRanking(category); // Recalcular ranking e pontos
      alert("Resultados salvos com sucesso!");
      renderAdmin(); // Atualiza a lista de equipes
    })
    .catch(err => console.error("Erro ao salvar resultados:", err));
}

// Calcular ranking, pontos e total
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
      const teamsWithResults = teams.filter(team => {
        const resultado = team[`prova${prova}`]?.resultado;
        return resultado !== null && resultado !== "";
      });

      // Ordenar os resultados (convertendo para número quando necessário)
      teamsWithResults.sort((a, b) => parseFloat(a[`prova${prova}`].resultado) - parseFloat(b[`prova${prova}`].resultado));

      // Atribuir rank e pontos
      teamsWithResults.forEach((team, index) => {
        const rank = index + 1;
        const pontos = 100 - (rank - 1) * 10; // Exemplo de cálculo: 1º lugar = 100 pontos, 2º = 90, etc.

        const teamRef = db.ref(`categories/${category}/teams/${team.name}/prova${prova}`);
        teamRef.update({ rank, pontos }).catch(err => console.error("Erro ao atualizar rank/pontos:", err));
      });
    });

    // Recalcular o total de pontos para cada equipe
    teams.forEach(team => {
      const total =
        (team.prova1?.pontos || 0) +
        (team.prova2?.pontos || 0) +
        (team.prova3?.pontos || 0);

      db.ref(`categories/${category}/teams/${team.name}`).update({ total }).catch(err => console.error("Erro ao atualizar total:", err));
    });
  });
}

// Renderizar interface de administração
function renderAdmin(initialLoad = false) {
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

  // Conectar os formulários às funções se for o primeiro carregamento
  if (initialLoad) {
    const addForm = document.getElementById("addForm");
    addForm.addEventListener("submit", addTeam);
  }
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

// Inicializar ao carregar a página
window.onload = function () {
  initFirebase();
  renderAdmin(true);
};

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

// Cadastrar uma nova prova
function addProva(event) {
  event.preventDefault(); // Previne o reload da página

  const provaInput = document.getElementById("provaInput");
  const tipoProvaInput = document.getElementById("tipoProvaInput");

  const provaName = provaInput.value.trim();
  const provaType = tipoProvaInput.value;

  if (!provaName || !provaType) {
    alert("Por favor, preencha todos os campos para cadastrar uma nova prova.");
    return;
  }

  db.ref("provas")
    .once("value")
    .then(snapshot => {
      const provasCount = snapshot.numChildren();
      const newProvaKey = `prova${provasCount + 1}`;

      const newProvaData = {
        nome: provaName,
        tipo: provaType
      };

      db.ref(`provas/${newProvaKey}`)
        .set(newProvaData)
        .then(() => {
          alert("Prova cadastrada com sucesso!");
          provaInput.value = ""; // Limpar o campo de input
          renderAdmin(); // Atualizar a lista de provas
        })
        .catch(err => {
          console.error("Erro ao cadastrar nova prova:", err);
          alert("Ocorreu um erro ao cadastrar a nova prova. Verifique o console para mais detalhes.");
        });
    });
}

// Renderizar interface de administração (lista de duplas e provas)
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

  // Se for o primeiro carregamento, conectar os formulários às funções
  if (initialLoad) {
    const addForm = document.getElementById("addForm");
    const provaForm = document.getElementById("provaForm");
    addForm.addEventListener("submit", addTeam);
    provaForm.addEventListener("submit", addProva);
  }
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

// Inicializar ao carregar a página
window.onload = function () {
  initFirebase();
  renderAdmin(true);
};

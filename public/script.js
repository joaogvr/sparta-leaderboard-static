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
    .then((snapshot) => {
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
          provaInput.value = ""; // Limpa o campo de entrada
          renderAdmin(); // Atualiza a lista de provas
        })
        .catch((err) => {
          console.error("Erro ao cadastrar nova prova:", err);
          alert("Ocorreu um erro ao cadastrar a nova prova. Verifique o console para mais detalhes.");
        });
    });
}

// Renderizar a interface de administração
function renderAdmin(initialLoad = false) {
  const teamsList = document.getElementById("teamsList");

  function loadTeams() {
    db.ref("categories").once("value").then((snapshot) => {
      teamsList.innerHTML = "";
      snapshot.forEach((cat) => {
        const category = cat.key;

        // Listar equipes existentes
        cat.child("teams").forEach((teamSnap) => {
          const team = teamSnap.key;
          const data = teamSnap.val();
          const div = document.createElement("div");
          div.className = "card";
          div.innerHTML = `
            <h3>${team}</h3><p>${data.box} (${category})</p>
            ${[1, 2, 3].map(
              (i) =>
                `<input type="text" id="res-${category}-${team}-p${i}" 
                value="${data["prova" + i]?.resultado ?? ""}" 
                placeholder="Resultado P${i} (Ex: 02:54, 100kg, reps)">`
            ).join("")}
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
    // Associa os eventos aos formulários
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
      alert("Resultado salvo com sucesso!");
    })
    .catch((err) => {
      console.error("Erro ao salvar resultados:", err);
    });
}

// Inicializar ao carregar a página
window.onload = function () {
  initFirebase();
};

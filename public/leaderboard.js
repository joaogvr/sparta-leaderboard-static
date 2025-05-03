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
        <td>${team.prova1?.resultado ? `${team.prova1.resultado} reps` : '-'}</td>
        <td>${team.prova1?.rank || '-'}</td>
        <td>${team.prova1?.pontos || '-'}</td>
        <td>${team.prova2?.resultado ? `${team.prova2.resultado} kg` : '-'}</td>
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

// Inicializar ao carregar a página
window.onload = function () {
  initFirebase();
  setupTabs();
};

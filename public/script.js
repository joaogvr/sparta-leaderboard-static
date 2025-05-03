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

    let table = `<table>
      <thead>
        <tr>
          <th>Equipe</th>
          <th>Prova 1</th>
          <th>Prova 2</th>
          <th>Prova 3</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>`;
    
    Object.entries(teams).forEach(([teamName, teamData]) => {
      table += `<tr>
        <td>${teamName}</td>
        <td>${formatProva(teamData.prova1)}</td>
        <td>${formatProva(teamData.prova2)}</td>
        <td>${formatProva(teamData.prova3)}</td>
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

// Formatar uma prova para exibição
function formatProva(prova) {
  if (!prova) return "-";
  return `Rank: ${prova.rank || '-'}, Pontos: ${prova.pontos || '-'}`;
}

// Função para calcular os ranks e pontos
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
      const teamsWithResults = teams.filter(team => team[`prova${prova}`]?.resultado != null);

      // Converter resultados para segundos ou manter como número
      teamsWithResults.forEach(team => {
        const resultado = team[`prova${prova}`]?.resultado;
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
  }).catch(err => console.error("Erro ao calcular ranking:", err));
}

// Converter mm:ss para segundos
function convertToSeconds(time) {
  const parts = time.split(":");
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return parseFloat(time);
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

// Chamar a função de inicialização ao carregar a página
window.onload = function () {
  initFirebase();
  setupTabs();
};

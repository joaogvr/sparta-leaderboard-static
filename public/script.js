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

function initFirebase() {
  const app = firebase.initializeApp(firebaseConfig);
  db = firebase.database();
}

// Pontuação padrão
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

// Validação FOR TIME
function isValidForTime(value) {
  return typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value);
}

// Função de ranking com suporte a mm:ss
async function calculateRanking(teams) {
  const snapshot = await db.ref("provas").once("value");
  const provas = {};
  snapshot.forEach(p => provas[p.key] = p.val());

  for (let prova = 1; prova <= 3; prova++) {
    const tipo = provas[`prova${prova}`]?.tipo;
    if (!tipo) continue;

    const filtrados = teams.filter(t => t[`prova${prova}`]?.resultado != null);

    filtrados.forEach(t => {
      const res = t[`prova${prova}`].resultado;
      let convertido;

      if (tipo === "FOR TIME" && typeof res === "string" && res.includes(":")) {
        const [min, sec] = res.split(":").map(Number);
        convertido = min * 60 + sec;
      } else {
        convertido = parseFloat(res);
      }

      t[`prova${prova}`].resultado_convertido = convertido;
    });

    filtrados.sort((a, b) =>
      tipo === "FOR TIME"
        ? a[`prova${prova}`].resultado_convertido - b[`prova${prova}`].resultado_convertido
        : b[`prova${prova}`].resultado_convertido - a[`prova${prova}`].resultado_convertido
    );

    filtrados.forEach((team, i) => {
      team[`prova${prova}`].rank = i + 1;
      team[`prova${prova}`].pontos = pontosPorPosicao(i + 1);
      db.ref(`categories/${team.category}/teams/${team.name}/prova${prova}`).update({
        rank: i + 1,
        pontos: team[`prova${prova}`].pontos
      });
    });
  }

  teams.forEach(t => {
    t.total = [1, 2, 3].reduce((sum, i) => sum + (t[`prova${i}`]?.pontos ?? 0), 0);
    db.ref(`categories/${t.category}/teams/${t.name}`).update({ total: t.total });
  });

  teams.sort((a, b) => b.total - a.total);
  return teams;
}

// Função saveResults com validação mm:ss
window.saveResults = async function(category, team) {
  const updates = {};
  const provasSnap = await db.ref("provas").once("value");
  const tipos = {};
  provasSnap.forEach(p => tipos[p.key] = p.val().tipo);

  for (let i = 1; i <= 3; i++) {
    const input = document.getElementById(`res-${category}-${team}-p${i}`);
    if (!input) continue;

    const val = input.value.trim();
    if (val !== "") {
      const tipo = tipos[`prova${i}`];
      if (tipo === "FOR TIME") {
        if (!isValidForTime(val)) {
          alert(`Formato inválido para FOR TIME na Prova ${i}. Use mm:ss.`);
          return;
        }
        updates[`prova${i}/resultado`] = val;
      } else {
        const parsed = parseFloat(val.replace(",", "."));
        if (!isNaN(parsed)) {
          updates[`prova${i}/resultado`] = parsed;
        }
      }
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

  await calculateRanking(teams);
  alert("Resultado salvo com sucesso!");
  renderAdmin(true);
};

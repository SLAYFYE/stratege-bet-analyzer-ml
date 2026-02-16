/* Stratège Bet Analyzer 3.0 - Logiciel de Prédiction
   Adapté pour Samuel - Étudiant L1 Lomé
*/

// --- CONFIGURATION INITIALE ---
const DEFAULT_WEIGHTS = { wDA: 0.7, wTC: 1.5, wTNC: -0.5, wCorners: 1.2, bias: 0 };
const STORAGE_KEYS = { weights: 'sba_weights', history: 'sba_history', bankroll: 'sba_bankroll' };

// Initialisation de la Bankroll (100 000 F CFA par défaut comme convenu)
let bankroll = parseFloat(localStorage.getItem(STORAGE_KEYS.bankroll)) || 100000;
let weights = JSON.parse(localStorage.getItem(STORAGE_KEYS.weights)) || DEFAULT_WEIGHTS;
let lastAnalysis = null;

// --- FONCTIONS DE CALCUL ---

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x / 15));
}

function calculerAnalyse(data) {
    let totalTirs = data.tc + data.tnc;
    let scoreCalcul = (data.da * weights.wDA) + (data.tc * weights.wTC) + (data.tnc * weights.wTNC) + (data.corners * weights.wCorners) + weights.bias;

    // --- RÈGLES HEURISTIQUES (TON EXPÉRIENCE) ---
    let overProb = 0;
    let underProb = 0;
    let alerteSterile = false;

    // 1. Loi Al Jazira (Domination stérile)
    if (data.possession > 60 && data.corners < 3 && data.tc < 2) {
        alerteSterile = true;
        scoreCalcul -= 30; // Chute brutale de la confiance
    }

    // 2. Profil Over (La Mitraillette)
    if (data.da > 50 && totalTirs > 10 && data.corners > 4) {
        overProb += 40;
    }

    // 3. Profil Under (Le Cimetière)
    if (data.da < 35 && totalTirs < 6 && data.corners < 3) {
        // Piège TNC (Imprécision)
        if (data.tnc > 4) {
            underProb += 10; // Moins confiant si ça tire partout à côté
        } else {
            underProb += 40;
        }
    }

    // Calcul de la confiance finale (0 à 100)
    let baseConf = sigmoid(scoreCalcul + (overProb - underProb)) * 100;
    
    // Filtres Ligues (Bonus/Malus)
    const ligue = data.league.toLowerCase();
    if (ligue.includes('brésil') || ligue.includes('japon')) baseConf += 10;
    if (ligue.includes('ghana') || ligue.includes('algérie')) baseConf -= 15;

    let confiance = Math.min(Math.max(baseConf, 5), 98).toFixed(0);

    // Détermination du verdict
    let verdict = "NO BET";
    if (confiance > 75) {
        verdict = (overProb > underProb) ? "🔥 OVER 2.5" : "🧊 UNDER 2.5";
    }
    if (alerteSterile) verdict = "🚫 ÉVITER (STÉRILE)";

    return {
        verdict,
        confiance,
        alerteSterile,
        totalTirs,
        explanation: genererExplication(data, verdict, alerteSterile)
    };
}

function genererExplication(data, verdict, sterile) {
    if (sterile) return "Attention : L'équipe domine mais ne cadre rien. Risque de score vierge élevé.";
    if (verdict.includes("OVER")) return `Forte intensité détectée (${data.da} DA). Le volume de tirs (${data.tc + data.tnc}) favorise une ouverture du score.`;
    if (verdict.includes("UNDER")) return "Rythme de match très lent. Peu d'occasions franches. Profil de match fermé.";
    return "Les statistiques sont trop équilibrées ou insuffisantes pour prendre un risque.";
}

// --- GESTION DE L'INTERFACE ---

const form = document.getElementById('liveForm');
const resultCard = document.getElementById('resultCard');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const data = {
        score: document.getElementById('score').value,
        possession: parseInt(document.getElementById('possession').value),
        da: parseInt(document.getElementById('da').value),
        tc: parseInt(document.getElementById('tc').value),
        tnc: parseInt(document.getElementById('tnc').value),
        corners: parseInt(document.getElementById('corners').value),
        league: document.getElementById('league').value
    };

    const analyse = calculerAnalyse(data);
    lastAnalysis = { data, analyse };

    // Mise à jour UI
    document.getElementById('verdict').innerText = analyse.verdict;
    document.getElementById('confidence').innerText = `Confiance : ${analyse.confiance}%`;
    document.getElementById('confidenceBar').style.width = `${analyse.confiance}%`;
    document.getElementById('explanation').innerText = analyse.explanation;
    
    if (analyse.alerteSterile) {
        document.getElementById('sterileWarning').classList.remove('hidden');
    } else {
        document.getElementById('sterileWarning').classList.add('hidden');
    }

    resultCard.classList.remove('hidden');
    window.scrollTo(0, document.body.scrollHeight);
});

// --- SYSTÈME D'APPRENTISSAGE (Feedback) ---

document.getElementById('btnMarkWin').addEventListener('click', () => {
    if (!lastAnalysis) return;
    // L'IA renforce ses poids si elle a eu raison
    weights.wDA += 0.02;
    weights.wTC += 0.05;
    sauvegarderEtReset("Gagné ! Bankroll boostée.");
});

document.getElementById('btnMarkLoss').addEventListener('click', () => {
    if (!lastAnalysis) return;
    // L'IA s'ajuste si elle a eu tort
    weights.wTNC -= 0.05;
    sauvegarderEtReset("Perdu. L'IA analyse l'erreur...");
});

function sauvegarderEtReset(msg) {
    localStorage.setItem(STORAGE_KEYS.weights, JSON.stringify(weights));
    alert(msg);
    location.reload();
                           }

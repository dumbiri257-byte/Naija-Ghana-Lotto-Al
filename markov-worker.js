// markov-worker.js
self.onmessage = function(e) {
  const { type, payload } = e.data;
  if (type !== 'CALCULATE_MARKOV') return;

  const { matchingDraws, primarySeeds, machineSeeds, maxN, winCount, macCount } = payload;

  const winTransitions = Array.from({ length: maxN + 1 }, () => Array(maxN + 1).fill(0));
  const macTransitions = Array.from({ length: maxN + 1 }, () => Array(maxN + 1).fill(0));
  const winCounts = Array(maxN + 1).fill(0);
  const macCounts = Array(maxN + 1).fill(0);

  for (let i = 0; i < matchingDraws.length - 1; i++) {
    const currentDraw = matchingDraws[i + 1];
    const nextDraw = matchingDraws[i];

    const currWin = (currentDraw.numbers || '').split(/[-,\s]+/).map(Number).filter(n => n > 0 && n <= maxN);
    const nextWin = (nextDraw.numbers || '').split(/[-,\s]+/).map(Number).filter(n => n > 0 && n <= maxN);

    const currMac = (currentDraw.machine || '').split(/[-,\s]+/).map(Number).filter(n => n > 0 && n <= maxN);
    const nextMac = (nextDraw.machine || '').split(/[-,\s]+/).map(Number).filter(n => n > 0 && n <= maxN);

    currWin.forEach(c => {
      winCounts[c]++;
      nextWin.forEach(n => { winTransitions[c][n]++; });
    });

    currMac.forEach(c => {
      macCounts[c]++;
      nextMac.forEach(n => { macTransitions[c][n]++; });
    });
  }

  const winT = Array.from({ length: maxN + 1 }, () => Array(maxN + 1).fill(0));
  const macT = Array.from({ length: maxN + 1 }, () => Array(maxN + 1).fill(0));

  for (let i = 1; i <= maxN; i++) {
    const sumWin = winCounts[i];
    const sumMac = macCounts[i];
    for (let j = 1; j <= maxN; j++) {
      winT[i][j] = sumWin > 0 ? (winTransitions[i][j] / sumWin) : (1 / maxN);
      macT[i][j] = sumMac > 0 ? (macTransitions[i][j] / sumMac) : (1 / maxN);
    }
  }

  const piWin0 = Array(maxN + 1).fill(0);
  if (primarySeeds.length > 0) {
    primarySeeds.forEach(s => { if (s <= maxN) piWin0[s] = 1 / primarySeeds.length; });
  } else {
    for (let i = 1; i <= maxN; i++) piWin0[i] = 1 / maxN;
  }

  const activeMacSeeds = machineSeeds.length > 0 ? machineSeeds : primarySeeds;
  const piMac0 = Array(maxN + 1).fill(0);
  if (activeMacSeeds.length > 0) {
    activeMacSeeds.forEach(s => { if (s <= maxN) piMac0[s] = 1 / activeMacSeeds.length; });
  } else {
    for (let i = 1; i <= maxN; i++) piMac0[i] = 1 / maxN;
  }

  const winScores = Array(maxN + 1).fill(0);
  const macScores = Array(maxN + 1).fill(0);

  for (let j = 1; j <= maxN; j++) {
    for (let i = 1; i <= maxN; i++) {
      winScores[j] += piWin0[i] * winT[i][j];
      macScores[j] += piMac0[i] * macT[i][j];
    }
  }

  const winScoresMap = {};
  const macScoresMap = {};
  for (let i = 1; i <= maxN; i++) {
    winScoresMap[i] = Number.isNaN(winScores[i]) ? 0 : winScores[i];
    macScoresMap[i] = Number.isNaN(macScores[i]) ? 0 : macScores[i];
  }

  const rankedPrimary = Object.keys(winScoresMap).map(Number)
    .filter(n => n > 0 && n <= maxN && !primarySeeds.includes(n))
    .sort((a, b) => winScoresMap[b] - winScoresMap[a]);

  const rankedMachine = Object.keys(macScoresMap).map(Number)
    .filter(n => n > 0 && n <= maxN && !primarySeeds.includes(n) && !machineSeeds.includes(n))
    .sort((a, b) => macScoresMap[b] - macScoresMap[a]);

  self.postMessage({
    type: 'MARKOV_SUCCESS',
    payload: {
      topPrimary: rankedPrimary.slice(0, winCount),
      topMachine: rankedMachine.slice(0, macCount),
      winScores: winScoresMap,
      macScores: macScoresMap
    }
  });
};
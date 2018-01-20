const d2gsi = require('dota2-gsi');
const getTalents = require('./talentParser');
const axios = require('axios');

let heroTalents = [];
let hasHero = false;
let heroName = '';
let displayTalents = false;
let token = null;
let connectionFailedCallback = null;

const dotaIlluminateBackend = 'https://www.dotailluminate.pro';

function dispatchGameState(gameState) {
  console.log("dispatching game state", gameState);
  axios.post(
    `${dotaIlluminateBackend}/hello`,
    Object.assign(gameState, { token: token })
  ).then(res => {
    if (!res.data.success) {
      connectionFailedCallback();
    }
  }).catch(err => {
    connectionFailedCallback(err);
  });
}

const initializeGsiListener = function(ebsToken, onError) {
  token = ebsToken;
  connectionFailedCallback = onError;
  const server = new d2gsi();
  dispatchGameState({});

  server.events.on('newclient', function(client) {
    // If we don't get any events here, make the user restart his dota client

    client.on('player:activity', function(activity) {
      if (activity === 'playing') {
        heroTalents = [];
        hasHero = false;
      }
    });

    client.on('hero:level', function(level) {
      if (!displayTalents && level > 0) {
        displayTalents = true;
        dispatchGameState({
          displayingTalents: true,
        });
      }
    });

    client.on('newdata', function(rawdata) {
      if (rawdata.hero && rawdata.hero.name && !hasHero) {
        hasHero = true;
        heroName = rawdata.hero.name;
        heroTalents = getTalents(heroName);
        dispatchGameState({
          talents: heroTalents,
        });
      } else if (displayTalents && (!rawdata.hero || !rawdata.hero.name)) {
        hasHero = false;
        displayTalents = false;
        dispatchGameState({
          displayingTalents: false,
        });
      }
    });
  });

  return server;
};



module.exports = initializeGsiListener;

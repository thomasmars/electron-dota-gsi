const d2gsi = require('dota2-gsi');
const getTalents = require('./talentParser');
const axios = require('axios');

let heroTalents = [];
let hasHero = false;
let heroName = '';
let displayTalents = false;
let token = null;
let connectionFailedCallback = null;
let prevTalentsCount = null;

// Singleton server, we only run it once
let server = null;

const dotaIlluminateBackend = 'https://www.dotailluminate.pro';

function dispatchGameState(gameState) {
  console.log("dispatching gamestate", gameState);
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
  // Server already running
  if (server) {
    return;
  }

  token = ebsToken;
  connectionFailedCallback = onError;
  server = new d2gsi();
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

    client.on('map:game_state', (state) => {
      const isLive = state === "DOTA_GAMERULES_STATE_PRE_GAME" ||
        state === "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS";

      if (isLive) {
        dispatchGameState({
          displayingTalents: true,
        });
      }
      else {
        dispatchGameState({
          displayingTalents: false,
        });
      }
    });

    client.on('newdata', function(rawdata) {
      if (rawdata.hero && rawdata.hero.name && !hasHero) {
        hasHero = true;
        heroName = rawdata.hero.name;
        heroTalents = getTalents(heroName);

        const gameState = {
          talents: heroTalents,
        };

        const isAlreadyLive = rawdata.map &&
          rawdata.map.game_state &&
          (
            rawdata.map.game_state === "DOTA_GAMERULES_STATE_PRE_GAME" ||
            rawdata.map.game_state === "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS"
          );

        if (isAlreadyLive) {
          gameState.displayingTalents = true;
        }

        dispatchGameState(gameState);
      } else if (displayTalents && (!rawdata.hero || !rawdata.hero.name)) {
        // This only happens when game started.
        hasHero = false;
        displayTalents = false;

        // Reset state completely
        dispatchGameState({
          displayingTalents: false,
          talents: null,
          chosenTalents: null,
        });
      } else if (rawdata.hero && rawdata.hero.name) {
        // Check if talents has changed (lowest priority)

        // TODO: can't dispatch game state all the time
        const chosenTalents = {
          talent_1: rawdata.hero.talent_1,
          talent_2: rawdata.hero.talent_2,
          talent_3: rawdata.hero.talent_3,
          talent_4: rawdata.hero.talent_4,
          talent_5: rawdata.hero.talent_5,
          talent_6: rawdata.hero.talent_6,
          talent_7: rawdata.hero.talent_7,
          talent_8: rawdata.hero.talent_8,
        };

        const talents = Object.values(chosenTalents);
        // Talent signature is just a count of # of selected talents
        const talentsChosenCount = talents.reduce((prev, curr) => {
          return prev + (curr === true ? 1 : 0);
        }, 0);

        // No selected talents, do not dispatch anything
        if (talentsChosenCount <= 0) {
          console.log("no selected talents");
          return;
        }

        // Check if talents chosen are different from previous.
        if (talentsChosenCount > prevTalentsCount) {
          // Dispatch the new chosen talents
          dispatchGameState({ chosenTalents });
          prevTalentsCount = talentsChosenCount;
        }
      }
    });
  });

  return server;
};

function setTwitchToken(changedToken) {
  token = changedToken;

  // Dispatch game state with new token.
  dispatchGameState({});
}


module.exports = {
  initializeGsiListener,
  setTwitchToken
};

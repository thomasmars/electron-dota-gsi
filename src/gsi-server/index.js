const d2gsi = require('dota2-gsi');
const getTalents = require('./talentParser');

let heroTalents = [];
let hasHero = false;
let heroName = '';
let displayTalents = false;

const initializeGsiListener = function() {
  const server = new d2gsi();
  console.log('intializing server..');
  server.events.on('newclient', function(client) {
    // If we don't get any events here, make the user restart his dota client
    console.log('now listening for events..');

    client.on('player:activity', function(activity) {
      if (activity === 'playing') {
        heroTalents = [];
        hasHero = false;
      }
    });

    client.on('hero:level', function(level) {
      if (!displayTalents && level > 0) {
        displayTalents = true;
        console.log('displaying talents');
      }
    });

    client.on('newdata', function(rawdata) {
      if (rawdata.hero && rawdata.hero.name && !hasHero) {
        hasHero = true;
        heroName = rawdata.hero.name;
        heroTalents = getTalents(heroName);
        console.log('hero talents', heroTalents);
      } else if (displayTalents && (!rawdata.hero || !rawdata.hero.name)) {
        hasHero = false;
        displayTalents = false;
        console.log('stop displaying talents');
      }
    });
  });

  return server;
};

module.exports = initializeGsiListener;

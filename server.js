
/**
 * Cyberfight Demos Downloader 0.1.0
 * Copyright 2015 Egor Kotlyarov aka Danmer
 * Available under MIT license
 *
 * Usage: npm start [game_id1] [game_id2] ...
 */

var http    = require('http');
var fs      = require('fs');
var _       = require('lodash');
var request = require('request');
var jsdom   = require('jsdom');
var mkdirp  = require('mkdirp');
var iconv   = require('iconv-lite');

var gameIds = process.argv.splice(2);

parseGameIds(gameIds).then(function() {
  console.log('done!')
})

function parseGameIds(gamesIds) {
  console.log('parse games ids. count: ', gamesIds.length);
  return new Promise(function(resolve, reject) {
    var gameId;
    var index = 0;
    var gamesIdsCount = gamesIds.length;
    nextGameId();
    function nextGameId() {
      gameId = gamesIds.shift();
      if (gameId) {
        index++;
        console.log('parse game', gameId, '(' + index + '/' + gamesIdsCount + ')');
        getPagesLinks(gameId).then(parsePagesLinks).then(nextGameId);
      } else {
        resolve();
      }
    }
  });
}

function getPagesLinks(gameId) {
  console.log('request pages links');
  return new Promise(function(resolve, reject) {
    jsdom.env({
      url: 'http://cyberfight.ru/site/demos/search/?game_id=' + gameId + '&order_by=time_posted&order_type=desc&qry=&page=0',
      done: function(errors, window) {
        var pagesLinks = [];
        if (!errors) {
          var $pageLinks = window.document.querySelectorAll('a[href^="/site/demos/search/?game_id=' + gameId + '&order_by=time_posted&order_type=desc&qry=&page="]');
          pagesLinks = _.uniq(_.pluck($pageLinks, 'href'));
        } else {
          console.error('request error', errors);
        }
        // get 1 random page link for test
        // pagesLinks = _.sample(pagesLinks, 1);
        window.close();
        resolve(pagesLinks);
      }
    });
  });
}

function parsePagesLinks(pagesLinks) {
  console.log('parse page links');
  return new Promise(function(resolve, reject) {
    var pageLink = '';
    var index = 0;
    var pagesLinksCount = pagesLinks.length;
    nextPageLink();
    function nextPageLink() {
      pageLink = pagesLinks.shift();
      if (pageLink) {
        index++;
        console.log('parse page link', pageLink, '(' + index + '/' + pagesLinksCount + ')');
        getDemosLinks(pageLink).then(parseDemosLinks).then(nextPageLink);
      } else {
        resolve();
      }
    }
  });
}

function getDemosLinks(pageLink) {
  console.log('request demos links on pageLink');
  return new Promise(function(resolve, reject) {
    jsdom.env({
      url: pageLink,
      done: function(errors, window) {
        var demosLinks = [];
        if (!errors) {
          var $demosLinks = window.document.querySelectorAll('tr[valign="middle"] a[href^="/site/demos/"][href$="/"]');
          demosLinks = _.uniq(_.pluck($demosLinks, 'href'));
        } else {
          console.error('request error', errors);
        }
        // get 3 random demo links for test
        // demosLinks = _.sample(demosLinks, 3);
        window.close();
        resolve(demosLinks);
      }
    });
  });
}

function parseDemosLinks(demosLinks) {
  console.log('parse demos links. count:', demosLinks.length);
  return new Promise(function(resolve, reject) {
    var demoLink;
    var index = 0;
    var demosLinksCount = demosLinks.length;
    nextDemoLink();
    function nextDemoLink() {
      demoLink = demosLinks.shift();
      if (demoLink) {
        index++;
        console.log('parse demo link', demoLink, '(' + index + '/' + demosLinksCount + ')');
        parseDemoLink(demoLink).then(nextDemoLink);
      } else {
        resolve();
      }
    }
  });
}

function parseDemoLink(demoLink) {
  return new Promise(function(resolve, reject) {
    var demoDir = 'demos/' + demoLink.match(/\d+/)[0];
    fs.exists(demoDir, function(exists) {
      if (!exists) {
        getDemoInfo(demoLink).then(downloadDemo).then(resolve);
      } else {
        resolve()
      }
    });
  });
}

function getDemoInfo(demoLink) {
  console.log('request demo info');
  return new Promise(function(resolve, reject) {
    http.get(demoLink, function(response) {
      response.pipe(iconv.decodeStream('win1251')).collect(function(error, decodedBody) {
        if (error) {
          console.log('reqeust error', error);
          reject();
        } else {
          jsdom.env({
            html: decodedBody,
            done: function(errors, window) {
              var demoInfo = null
              if (!errors) {
                var $infoTable = window.document.querySelectorAll('.blockheaddarkBig')[0].parentNode.parentNode;
                demoInfo = {
                  source: demoLink,
                  id: demoLink.match(/\d+/)[0],
                  name: $infoTable.querySelector('tr:nth-child(1)').textContent.trim(),
                  pov: $infoTable.querySelector('tr:nth-child(2) td:nth-child(2)').textContent.trim(),
                  map: $infoTable.querySelector('tr:nth-child(3) td:nth-child(2)').textContent.trim(),
                  type: $infoTable.querySelector('tr:nth-child(4) td:nth-child(2)').textContent.trim(),
                  tourney: $infoTable.querySelector('tr:nth-child(5) td:nth-child(2)').textContent.trim(),
                  downloads: $infoTable.querySelector('tr:nth-child(6) td:nth-child(2)').textContent.trim(),
                  description: $infoTable.querySelector('tr:nth-child(7) td:nth-child(2)').textContent.trim(),
                  fileName: $infoTable.querySelector('tr:nth-child(8)').textContent.trim().split('\n')[0].trim(),
                  fileSize: $infoTable.querySelector('tr:nth-child(8)').textContent.trim().split('\n')[2].trim().replace('(', '').replace(')', ''),
                  fileLink: $infoTable.querySelector('tr:nth-child(8) a').href
                };
                console.log(demoInfo);
                window.close();
                resolve(demoInfo);
              } else {
                console.error('data error', errors);
                reject();
              }
            }
          });
        }
      });
    });
  });
}

function downloadDemo(demoInfo) {
  console.log('download demo');
  return new Promise(function(resolve, reject) {
    var demoDir = 'demos/' + demoInfo.id;
    fs.exists(demoDir, function(exists) {
      if (!exists) {
        mkdirp(demoDir, function() {
          fs.writeFile(demoDir + '/info.json', JSON.stringify(demoInfo, null, 2), resolve);
          request(demoInfo.fileLink, resolve).pipe(fs.createWriteStream(demoDir + '/' + demoInfo.fileName))
        })
      }
    });
  });
}

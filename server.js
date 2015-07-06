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
var charset = require('charset');
var cheerio = require('cheerio');
var mkdirp  = require('mkdirp');
var iconv   = require('iconv-lite');

var gameIds = process.argv.splice(2);

parseGameIds(gameIds).then(function() {
  console.log('done!')
})

function parseGameIds(gamesIds) {
  console.log('parse games ids:', gamesIds);
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
    http.get('http://cyberfight.ru/site/demos/search/?game_id=' + gameId + '&order_by=time_posted&order_type=desc&qry=&page=0', function(response) {
      var pagesLinks = [];
      var sourceCharset = charset(response.headers['content-type']);
      response.pipe(iconv.decodeStream(sourceCharset)).collect(function(error, decodedBody) {
        if (!error && response.statusCode == 200) {
          var $ = cheerio.load(decodedBody, {normalizeWhitespace: true, decodeEntities: false});
          $('a[href^="/site/demos/search/?game_id=' + gameId + '"][href*="page"]').each(function(index, element) {
            pagesLinks.push('http://cyberfight.ru' + element.attribs.href);
          });
          pagesLinks = _.uniq(pagesLinks);
          // get 1 random page link for test
          // pagesLinks = _.sample(pagesLinks, 1);
        } else {
          console.error('request error', error)
        }
        resolve(pagesLinks);
      });
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
    http.get(pageLink, function(response) {
      var demosLinks = [];
      var sourceCharset = charset(response.headers['content-type']);
      response.pipe(iconv.decodeStream(sourceCharset)).collect(function(error, decodedBody) {
        if (!error && response.statusCode == 200) {
          var $ = cheerio.load(decodedBody, {normalizeWhitespace: true, decodeEntities: false});
          $('tr[valign="middle"] a[href^="/site/demos/"][href$="/"]').each(function(index, element) {
            demosLinks.push('http://cyberfight.ru' + element.attribs.href);
          });
          demosLinks = _.uniq(demosLinks);
          // get 3 random demo links for test
          // demosLinks = _.sample(demosLinks, 3);
        } else {
          console.error('request error', errors);
        }
        resolve(demosLinks);
      });
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
        console.log('already parsed. skip.')
        resolve()
      }
    });
  });
}

function getDemoInfo(demoLink) {
  console.log('request demo info');
  return new Promise(function(resolve, reject) {
    http.get(demoLink, function(response) {
      var demosLinks = [];
      var sourceCharset = charset(response.headers['content-type']);
      response.pipe(iconv.decodeStream(sourceCharset)).collect(function(error, decodedBody) {
        if (!error && response.statusCode == 200) {
          var $ = cheerio.load(decodedBody, {normalizeWhitespace: true, decodeEntities: false});
          var $infoTable = $('.blockheaddarkBig').parent().parent();
          var demoId = demoLink.match(/\d+/)[0];
          var demoHref = $infoTable.find('tr:nth-child(8) a')['0'].attribs.href;
          var fileId = demoHref.match(/file_id=(\d+)/)[1];
          var fileInfo = $infoTable.find('tr:nth-child(8)').eq(0).text().trim().split(/\s+/);
          var demoInfo = {
            source: demoLink,
            demoDir: 'demos/' + demoId,
            demoId: demoId,
            name: $infoTable.find('tr:nth-child(1)').eq(0).text().trim(),
            pov: $infoTable.find('tr:nth-child(2) td:nth-child(2)').eq(0).text().trim(),
            map: $infoTable.find('tr:nth-child(3) td:nth-child(2)').eq(0).text().trim(),
            type: $infoTable.find('tr:nth-child(4) td:nth-child(2)').eq(0).text().trim(),
            tourney: $infoTable.find('tr:nth-child(5) td:nth-child(2)').eq(0).text().trim(),
            downloads: $infoTable.find('tr:nth-child(6) td:nth-child(2)').eq(0).text().trim(),
            description: $infoTable.find('tr:nth-child(7) td:nth-child(2)').eq(0).text().trim(),
            fileId: fileId,
            fileName: fileInfo[0],
            fileSize: fileInfo[1] + ' ' +  fileInfo[2].replace(/\(\)/, ''),
            fileLink: 'http://files.cyberfight.ru/' + fileId + '/' + fileInfo[0]
          };
          console.log(demoInfo);
          resolve(demoInfo);
        } else {
          console.error('request error', errors);
          reject();
        }
      });
    });
  });
}

function downloadDemo(demoInfo) {
  console.log('download demo');
  return new Promise(function(resolve, reject) {
    mkdirp(demoInfo.demoDir, function() {
      var fileStream = fs.createWriteStream(demoInfo.demoDir + '/' + demoInfo.fileName);
      fileStream.on('finish', resolve);
      fs.writeFile(demoInfo.demoDir + '/info.json', JSON.stringify(demoInfo, null, 2));
      http.get(demoInfo.fileLink, function(response) {
        response.pipe(fileStream);
      });
    })
  });
}

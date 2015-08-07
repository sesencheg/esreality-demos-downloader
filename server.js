/**
 * Cyberfight Demos Downloader
 * Repository: https://github.com/Danmer/c58-demos-downloader
 * Copyright 2015 Egor Kotlyarov aka Danmer
 * Available under MIT license
 *
 * Usage: npm start [game_id1] [game_id2] ...
 */

var http        = require('http');
var fs          = require('fs');
var path        = require('path');
var _           = require('lodash');
var charset     = require('charset');
var cheerio     = require('cheerio');
var mkdirp      = require('mkdirp');
var iconv       = require('iconv-lite');
var prettyBytes = require('pretty-bytes');

var gameIds = process.argv.splice(2);

parseGameIds(gameIds).then(function() {
  console.log('done!');
});

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
      if (response.statusCode !== 200) {
        console.error('error on request. status code not 200:', response.statusCode);
        resolve([]);
        return;
      }
      var sourceCharset = charset(response.headers['content-type']);
      response.pipe(iconv.decodeStream(sourceCharset)).collect(function(error, decodedBody) {
        if (error) {
          console.error('error on requestStram', errors);
          resolve([]);
          return;
        }
        var $ = cheerio.load(decodedBody, {normalizeWhitespace: true, decodeEntities: false});
        var pagesLinks = _.uniq(_.map($('a[href^="/site/demos/search/?game_id=' + gameId + '"][href*="page"]'), function(el) {
          return 'http://cyberfight.ru' + el.attribs.href;
        }));
        // get 1 random page link for test
        // pagesLinks = _.sample(pagesLinks, 1);
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
      if (response.statusCode !== 200) {
        console.error('error on request. status code not 200:', response.statusCode);
        resolve([]);
        return;
      }
      var sourceCharset = charset(response.headers['content-type']);
      response.pipe(iconv.decodeStream(sourceCharset)).collect(function(error, decodedBody) {
        if (error) {
          console.error('error on requestStram', errors);
          resolve([]);
          return;
        }
        var $ = cheerio.load(decodedBody, {normalizeWhitespace: true, decodeEntities: false});
        var demosLinks = _.map($('tr[valign="middle"] a[href^="/site/demos/"][href$="/"]'), function(el) {
          return 'http://cyberfight.ru' + el.attribs.href;
        });
        demosLinks = _.uniq(demosLinks);
        // get 3 random demo links for test
        // demosLinks = _.sample(demosLinks, 3);
        resolve(demosLinks);
      });
    });
  });
}

function parseDemosLinks(demosLinks) {
  console.log('parsing demos links');
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
    var infoPath = 'demos/' + demoLink.match(/\d+/)[0] + '/info.json';
    fs.exists(infoPath, function(exists) {
      if (!exists) {
        getDemoInfo(demoLink).then(downloadDemo).then(resolve);
      } else {
        console.log('already parsed. skip.');
        resolve();
      }
    });
  });
}

function getDemoInfo(demoLink) {
  console.log('requesting demo info');
  return new Promise(function(resolve, reject) {
    http.get(demoLink, function(response) {
      var demosLinks = [];
      var sourceCharset = charset(response.headers['content-type']);
      if (response.statusCode !== 200) {
        console.error('error on request. status code not 200:', response.statusCode);
        reject();
        return;
      }
      response.pipe(iconv.decodeStream(sourceCharset)).collect(function(error, decodedBody) {
        if (error) {
          console.error('error on requestStream', error);
          reject();
          return;
        }
        var sourceCharset = charset(response.headers['content-type']);
        var $ = cheerio.load(decodedBody, {normalizeWhitespace: false, decodeEntities: false});
        var $infoTable = $('.blockheaddarkBig').parent().parent();
        var demoId = demoLink.match(/\d+/)[0];
        var demoHref = $infoTable.find('tr:nth-child(8) a')['0'].attribs.href;
        var fileId = demoHref.match(/file_id=(\d+)/)[1];
        var fileInfo = $infoTable.find('tr:nth-child(8)').eq(0).text().trim().split('\n');
        var fileName = fileInfo[0].trim();
        var encodedName = iconv.encode(fileName, sourceCharset).toString('hex').toUpperCase().match(/.{1,2}/g).map(function(char){return '%'+char}).join('');
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
          fileName: fileInfo[0].trim(),
          fileSize: fileInfo[2].trim().replace('(', '').replace(')', ''),
          fileLink: 'http://files.cyberfight.ru/' + fileId + '/' + fileName,
          encodedLink: 'http://files.cyberfight.ru/' + fileId + '/' + encodedName
        };
        console.log(demoInfo);
        resolve(demoInfo);
      });
    });
  });
}

function downloadDemo(demoInfo) {
  console.log('downloading demo');
  return new Promise(function(resolve, reject) {
    http.get(demoInfo.encodedLink, function(response) {
      response.on('error', function(error) {
        console.error('request error', error);
        reject();
      });
      if (response.statusCode == 200) {
        mkdirp(demoInfo.demoDir, function() {
          var demoPath = demoInfo.demoDir + '/' + demoInfo.fileName;
          var infoPath = demoInfo.demoDir + '/info.json';
          var contentLength = response.headers['content-length'];
          if (contentLength) {
            demoInfo.fileSize = prettyBytes(parseInt(contentLength));
          }
          var fileStream = fs.createWriteStream(demoPath);
          fileStream.on('error', function(error) {
            console.error('fileStream error', error);
            reject();
          });
          fileStream.on('finish', function() {
            console.log('success');
            fileStream.close(function() {
              fs.writeFile(infoPath, JSON.stringify(demoInfo, null, 2), resolve);
            });
          });
          response.pipe(fileStream);
        });
      } else {
        console.error('response error. status code:', response.statusCode);
        reject();
      }
    });
  });
}

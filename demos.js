/**
 * Esreality Demos Downloader
 * Repository: https://github.com/sesencheg/esreality-demos-downloader
 * Copyright 2025 Sergey Kositsyn aka Sesen
 * Available under MIT license
 *
 * Usage: node demos.js [game_id1] [game_id2] ...
 */

var http        = require('https');
var fs          = require('fs');
var path        = require('path');
var _           = require('lodash');
var charset     = require('charset');
var cheerio     = require('cheerio');
var mkdirp      = require('mkdirp');
var iconv       = require('iconv-lite');
var prettyBytes = require('pretty-bytes');
var he          = require('he');

var gameIds = process.argv.splice(2);

parseGameIds(gameIds).then(function() {
  console.log('done!');
});

function parseGameIds(gameIds) {
  console.log('parse games ids:');  
  return new Promise(function(resolve, reject) {
    console.log('parse game');
    var pagesLinks = [];
  for (var i = 1 ; i <= 102; i++) {
    pagesLinks.push('https://www.esreality.com/?a=demos&order=&age=&search=&event=&mod=&gametype=&map=&page='+i);
  }    
  parsePagesLinks(pagesLinks, gameIds).then(resolve);
  });
}


function parsePagesLinks(pagesLinks, gameIds) {
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
        getDemosLinks(pageLink, gameIds).then(parseDemosLinks).then(nextPageLink);
      } else {
        resolve();
      }
    }
  });
}

function getDemosLinks(pageLink, gameIds) {
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
        var demosLinks = _.map($('tr[valign="top"] a[href^="/post/"][href$="/"]'), function(el) {             
          if(gameIds.includes(el.parent.parent.children[3].children[0].data.trim())){
            return {demoLink: 'https://esreality.com' + el.attribs.href, dateTime: el.parent.parent.children[1].children[0].data.trim(), game: el.parent.parent.children[3].children[0].data.trim(), mod: el.parent.parent.children[5].children[0].data.trim(), type: el.parent.parent.children[7].children[0].data.trim(), map: el.parent.parent.children[15].children[0].data.trim(), text: el.attribs.title, tourney: el.parent.parent.children[17].children[1] != undefined ? el.parent.parent.children[17].children[1].children[0].data : ''}            
          }          
        });
        demosLinks = _.uniq(demosLinks);
        demosLinks = demosLinks.filter(element => element != undefined);     
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
        console.log('parse demo link', demoLink.demoLink, '(' + index + '/' + demosLinksCount + ')');
        parseDemoLink(demoLink).then(nextDemoLink);
      } else {
        resolve();
      }
    }
  });
}

function parseDemoLink(demoLink) {
  return new Promise(function(resolve, reject) {
    var infoPath = 'demos/' + demoLink.demoLink.match(/\d+/)[0] + '/info.json';        
    fs.exists(infoPath, function(exists) {
      if (!exists) {        
        getDemoInfo(demoLink).then(resolve);
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
    http.get(demoLink.demoLink, function(response) {
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
                
        var demoBlock = $('.postcontent').find('a[href^="/download.php?file_id"]');

    var demoId = demoLink.demoLink.match(/\d+/)[0];

        var demoInfos = _.uniq(_.map($('a[href^="/download.php?file_id"]'), function(el) {
          demoLink.encodedLink = 'https://esreality.com' + el.attribs.href;
          demoLink.demoDir = 'demos/' + demoId;
          demoLink.demoId = demoId;
          demoLink.fileName = el.children[0].data.replace("&gt;&gt; ", "").replace(" &lt;&lt;", "");
          return demoLink;          
        }));            

      var index = 0;      
      nextDemoInfo();
      function nextDemoInfo() {
        demoInfo = demoInfos.shift();       
        if (demoInfo) {
          index++;          
          downloadDemo(demoInfo).then(nextDemoInfo);
        } else {
          resolve();
        }
      }
      });
    });
  });
}

function downloadDemo(demoInfo) {  
  return new Promise(function(resolve, reject) {
    http.get(demoInfo.encodedLink, function(response) {
      response.on('error', function(error) {
        console.error('request error', error);
        reject();
      });
      if (response.statusCode == 200) {
        console.log('downloading demo');
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
      }
      else if (response.statusCode == 302){
        demoInfo.encodedLink = 'https://esreality.com' + response.headers.location;
        downloadDemo(demoInfo).then(() => resolve());       
      }
      else {
        console.error('response error. status code:', response.statusCode);
        resolve();
      }
    });
  });
}
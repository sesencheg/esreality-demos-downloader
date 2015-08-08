/**
 * Cyberfight Galleries Downloader
 * Repository: https://github.com/Danmer/c58-media-downloader
 * Copyright 2015 Egor Kotlyarov aka Danmer
 * Available under MIT license
 *
 * Usage: node galleries.js
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
var he          = require('he');

var gameIds = process.argv.splice(2);

parseGalleries().then(function() {
  console.log('done!');
});

function parseGalleries() {
  console.log('parse galleries');
  return new Promise(function(resolve, reject) {
    getGalleriesLinks().then(parseGalleriesLinks).then(resolve);
  });
}

function getGalleriesLinks() {
  console.log('request galleries links');
  return new Promise(function(resolve, reject) {
    http.get('http://cyberfight.ru/offline/gallery/', function(response) {
      if (response.statusCode !== 200) {
        console.error('error on request. status code not 200:', response.statusCode);
        resolve([]);
        return;
      }
      var galleriesLinks = [];
      var sourceCharset = charset(response.headers['content-type']);
      response.pipe(iconv.decodeStream(sourceCharset)).collect(function(error, decodedBody) {
        if (error) {
          console.error('error on requestStram', errors);
          resolve([]);
          return;
        }
        var $ = cheerio.load(decodedBody, {normalizeWhitespace: true, decodeEntities: false});
        var galleriesLinks = _.map($('a[href^="/offline/gallery/"][href!="/offline/gallery/"]'), function(el) {
          return 'http://cyberfight.ru' + el.attribs.href;
        });
        galleriesLinks = _.uniq(galleriesLinks).reverse();
        // console.log(galleriesLinks);
        // get 1 random page link for test
        // galleriesLinks = _.sample(galleriesLinks, 1);
        resolve(galleriesLinks);
      });
    });
  });
}

function parseGalleriesLinks(galleriesLinks) {
  console.log('parse gallery links');
  return new Promise(function(resolve, reject) {
    var galleryLink = '';
    var index = 0;
    var galleriesLinksCount = galleriesLinks.length;
    nextGalleryLink();
    function nextGalleryLink() {
      galleryLink = galleriesLinks.shift();
      if (galleryLink) {
        index++;
        var galleryDir = 'photos/' + galleryLink.match(/(\d+)\/$/)[1];
        var infoPath = galleryDir + '/info.json';
        if (fs.existsSync(infoPath)) {
          console.log('already parsed. skip.');
          nextGalleryLink();
          return;
        }
        console.log('parse gallery link', galleryLink, '(' + index + '/' + galleriesLinksCount + ')');
        mkdirp.sync(galleryDir);
        parseGalleryLink(galleryLink).then(function(galleryInfo) {
          parsePhotos(galleryInfo.photos).then(function(photos) {
            galleryInfo.photos = photos;
            fs.writeFile(infoPath, JSON.stringify(galleryInfo, null, 2), nextGalleryLink);
          });
        });
      } else {
        resolve();
      }
    }
  });
}

function parseGalleryLink(galleryLink) {
  console.log('request gallery info and photos info on galleryLink');
  return new Promise(function(resolve, reject) {
    http.get(galleryLink, function(response) {
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
        var galleryId = galleryLink.match(/(\d+)\/$/)[1];
        var firstPhotoId = $('table[width="1%"]').find('img').get(0).attribs.src.match(/(\d+)\/orig\/img(.+)/)[1];
        var photos = _.map($('td[bgcolor="#EEEEEE"]').find('b, a[href^="/offline/gallery/"]'), function(el) {
          return {
            source: 'http://cyberfight.ru' + (el.attribs.href || '/offline/gallery/' + galleryId + '/' + firstPhotoId + '/'),
            galleryId: galleryId
          };
        });
        var comments = _.map($('form > table'), function(el) {
          var commentMeta = $(el).find('.cont[bgcolor="#e5e5e5"]').html().trim().match(/<b>#(\d+)<\/b> - (.*) - <a href="(|.+\/profile\/(\d+)\/)"><b>(.*)<\/b><\/a>/)/* || []*/;
          var $commentContent = $(el).find('td[bgcolor="#efefef"] .cont');
          return {
            index: commentMeta[1],
            authorId: commentMeta[4] || null,
            authorName: commentMeta[5],
            dateTime: commentMeta[2],
            html: $commentContent.html().trim(),
            text: he.decode($commentContent.text().trim())
          };
        });
        var galleryInfo = {
          source: galleryLink,
          galleryId: galleryId,
          galleryTitle: $('table[width="1%"]').find('tr').eq(0).text().trim(),
          photosCount: photos.length,
          comentsCount: comments.length,
          photos: _.uniq(photos, function(photo) {
            return photo.source;
          }),
          comments: comments
        };
        // console.log(galleryInfo);
        // console.log(photosLinks);
        // get 3 random photo links for test
        // galleryInfo.photos = _.sample(galleryInfo.photos, 3);
        resolve(galleryInfo);
      });
    });
  });
}

function getPhotosLinks(galleryLink) {
  console.log('request photos links on galleryLink');
  return new Promise(function(resolve, reject) {
    var infoPath = 'photos/' + galleryLink.match(/(\d+)\/$/)[1] + '/info.json';
    if (fs.existsSync(infoPath)) {
      console.log('already parsed. skip.');
      resolve([]);
      return;
    }
    http.get(galleryLink, function(response) {
      if (response.statusCode !== 200) {
        console.error('error on request. status code not 200:', response.statusCode);
        resolve([]);
        return;
      }
      var photosLinks = [];
      var sourceCharset = charset(response.headers['content-type']);
      response.pipe(iconv.decodeStream(sourceCharset)).collect(function(error, decodedBody) {
        if (error) {
          console.error('error on requestStram', errors);
          resolve([]);
          return;
        }
        var $ = cheerio.load(decodedBody, {normalizeWhitespace: true, decodeEntities: false});
        var photosLinks = $('td[bgcolor="#EEEEEE"] a[href^="/offline/gallery/"]').map(function(i, el) {
          return 'http://cyberfight.ru' + el.attribs.href;
        });
        photosLinks = _.uniq(photosLinks);
        // console.log(photosLinks);
        // get 3 random photo links for test
        // photosLinks = _.sample(photosLinks, 10);
        resolve(photosLinks);
      });
    });
  });
}

function parsePhotos(photos) {
  console.log('parsing photos');
  return new Promise(function(resolve, reject) {
    var photosList = _.clone(photos, true);
    var photo;
    var index = 0;
    var photosCount = photos.length;
    nextPhoto();
    function nextPhoto() {
      photo = photosList.shift();
      if (photo) {
        index++;
        console.log('parse photo', photo.source, '(' + index + '/' + photosCount + ')');
        parsePhoto(photo).then(function(extendedPhoto) {
          photos[index - 1] = extendedPhoto;
          nextPhoto();
        });
      } else {
        resolve(photos);
      }
    }
  });
}

function parsePhotoLinks(photosLinks) {
  console.log('parsing photos links');
  return new Promise(function(resolve, reject) {
    var photoLink;
    var index = 0;
    var photosLinksCount = photosLinks.length;
    nextPhotoLink();
    function nextPhotoLink() {
      photoLink = photosLinks.shift();
      if (photoLink) {
        index++;
        console.log('parse photo link', photoLink, '(' + index + '/' + photosLinksCount + ')');
        parsePhotoLink(photoLink).then(nextPhotoLink);
      } else {
        resolve();
      }
    }
  });
}

function parsePhoto(photo) {
  return new Promise(function(resolve, reject) {
    getPhotoInfo(photo).then(downloadPhoto).then(resolve);
  });
}

function getPhotoInfo(photo) {
  // console.log('requesting photo info');
  return new Promise(function(resolve, reject) {
    var photoLink = photo.source;
    http.get(photoLink, function(response) {
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
        var $infoTable = $('table[width="1%"]');
        var imageSrc = $infoTable.find('img').get(0).attribs.src;
        _.extend(photo, {
          photoId: photoLink.match(/(\d+)\/$/)[1],
          photoTitle: $infoTable.find('tr').eq(2).text().trim(),
          imageId: imageSrc.match(/\/(\d+)\/orig/)[1],
          imageSrc: imageSrc,
          imageExt: path.extname(imageSrc)
        });
        resolve(photo);
      });
    });
  });
}

function downloadPhoto(photo) {
  console.log('downloading photo', photo.imageSrc);
  return new Promise(function(resolve, reject) {
    http.get(photo.imageSrc, function(response) {
      response.on('error', function(error) {
        console.error('request error', error);
        reject();
      });
      if (response.statusCode == 200) {
        var photoPath = 'photos/' + photo.galleryId + '/' + photo.photoId + photo.imageExt;
        var contentLength = response.headers['content-length'];
        if (contentLength) {
          photo.imageSize = prettyBytes(parseInt(contentLength));
        };
        var fileStream = fs.createWriteStream(photoPath);
        fileStream.on('error', function(error) {
          console.error('fileStream error', error);
          reject();
        });
        fileStream.on('finish', function() {
          console.log('success');
          fileStream.close(function() {
            resolve(photo);
          });
        });
        response.pipe(fileStream);
      } else {
        console.error('response error. status code:', response.statusCode);
        reject();
      }
    });
  });
}

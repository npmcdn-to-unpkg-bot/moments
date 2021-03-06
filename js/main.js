var initPhotoSwipeFromDOM = function(gallerySelector) {

  // parse slide data (url, title, size ...) from DOM elements
  // (children of gallerySelector)
  var parseThumbnailElements = function(el) {
    var thumbElements = el.childNodes,
        numNodes = thumbElements.length,
        items = [],
        figureEl,
        linkEl,
        size,
        item;

    for(var i = 0; i < numNodes; i++) {

      linkEl = thumbElements[i]; // <figure> element

      // include only element nodes
      if(linkEl.nodeType !== 1) {
          continue;
      }

      // linkEl = figureEl.children[0]; // <a> element

      size = linkEl.getAttribute('data-size').split('*');

      // create slide object
      item = {
        src: linkEl.getAttribute('href'),
        w: parseInt(size[0], 10),
        h: parseInt(size[1], 10),
        title: linkEl.children[0].getAttribute('alt')
      };

      // if(figureEl.children.length > 1) {
      //     // <figcaption> content
      //     item.title = figureEl.children[1].innerHTML;
      // }

      if(linkEl.children.length > 0) {
        // <img> thumbnail element, retrieving thumbnail url
        item.msrc = linkEl.children[0].getAttribute('src');
      }

      item.el = linkEl; // save link to element for getThumbBoundsFn
      items.push(item);
    }
    // console.log(items);
    return items;
  };

  // find nearest parent element
  var closest = function closest(el, fn) {
    return el && ( fn(el) ? el : closest(el.parentNode, fn) );
  };

  // triggers when user clicks on thumbnail
  var onThumbnailsClick = function(e) {
    e = e || window.event;
    e.preventDefault ? e.preventDefault() : e.returnValue = false;

    var eTarget = e.target || e.srcElement;

    // find root element of slide
    var clickedListItem = closest(eTarget, function(el) {
      return (el.tagName && el.tagName.toUpperCase() === 'A');
    });

    // console.log(clickedListItem);

    if(!clickedListItem) {
      return;
    }

    // find index of clicked item by looping through all child nodes
    // alternatively, you may define index via data- attribute
    var clickedGallery = clickedListItem.parentNode,
        childNodes = clickedListItem.parentNode.childNodes,
        numChildNodes = childNodes.length,
        nodeIndex = 0,
        index;

    for (var i = 0; i < numChildNodes; i++) {
      if(childNodes[i].nodeType !== 1) {
        continue;
      }

      if(childNodes[i] === clickedListItem) {
        index = nodeIndex;
        break;
      }
      nodeIndex++;
    }

    if(index >= 0) {
      // open PhotoSwipe if valid index found
      openPhotoSwipe( index, clickedGallery );
    }
    return false;
  };

  // parse picture index and gallery index from URL (#&pid=1&gid=2)
  var photoswipeParseHash = function() {
      var hash = window.location.hash.substring(1),
      params = {};

      if(hash.length < 5) {
          return params;
      }

      var vars = hash.split('&');
      for (var i = 0; i < vars.length; i++) {
          if(!vars[i]) {
              continue;
          }
          var pair = vars[i].split('=');
          if(pair.length < 2) {
              continue;
          }
          params[pair[0]] = pair[1];
      }

      if(params.gid) {
          params.gid = parseInt(params.gid, 10);
      }

      return params;
  };

  var openPhotoSwipe = function(index, galleryElement, disableAnimation, fromURL) {
      var pswpElement = document.querySelectorAll('.pswp')[0],
          gallery,
          options,
          items;

      items = parseThumbnailElements(galleryElement);

      // define options (if needed)
      options = {

          // define gallery index (for URL)
          galleryUID: galleryElement.getAttribute('data-pswp-uid'),

          getThumbBoundsFn: function(index) {
              // See Options -> getThumbBoundsFn section of documentation for more info
              var thumbnail = items[index].el.getElementsByTagName('img')[0], // find thumbnail
                  pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
                  rect = thumbnail.getBoundingClientRect();

              return {x:rect.left, y:rect.top + pageYScroll, w:rect.width};
          }

      };

      // PhotoSwipe opened from URL
      if(fromURL) {
          if(options.galleryPIDs) {
              // parse real index when custom PIDs are used
              // http://photoswipe.com/documentation/faq.html#custom-pid-in-url
              for(var j = 0; j < items.length; j++) {
                  if(items[j].pid == index) {
                      options.index = j;
                      break;
                  }
              }
          } else {
              // in URL indexes start from 1
              options.index = parseInt(index, 10) - 1;
          }
      } else {
          options.index = parseInt(index, 10);
      }

      // exit if index not found
      if( isNaN(options.index) ) {
          return;
      }

      if(disableAnimation) {
          options.showAnimationDuration = 0;
      }

      // Pass data to PhotoSwipe and initialize it
      gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
      gallery.init();
  };

  // loop through all gallery elements and bind events
  var galleryElements = document.querySelectorAll( gallerySelector );

  for(var i = 0, l = galleryElements.length; i < l; i++) {
    galleryElements[i].setAttribute('data-pswp-uid', i+1);
    galleryElements[i].onclick = onThumbnailsClick;
  }

  // Parse URL and open gallery if it contains #&pid=3&gid=1
  var hashData = photoswipeParseHash();
  if(hashData.pid && hashData.gid) {
    openPhotoSwipe( hashData.pid ,  galleryElements[ hashData.gid - 1 ], true, true );
  }
};

// execute above function

$( function() {

  $.getJSON('images/photos.json', function(data) {

    data.albums.sort(function(a, b){
      return a.timeStamp < b.timeStamp;
    });

    var galleryTemplate = $('#galleryTemplate').html();
    Mustache.parse(galleryTemplate);
    var renderedGallery = Mustache.render(galleryTemplate, data);
    var $gallery = $(renderedGallery);
    $gallery.appendTo('#albums');

    $('.album').each(function(){

      // console.log($(this).attr('id'));
      var albumID = $(this).attr('id');
      var filteredAlbums = data.albums.filter(function(album) {
        return album.albumID === albumID;
      });

      var photos = { photos: filteredAlbums[0].photos };
      // console.log(photos);

      var $container = $(this).masonry({
        itemSelector: '.album-thumbnail'
      });

      var thumbnailTemplate = $('#thumbnailTemplate').html();
      Mustache.parse(thumbnailTemplate);
      var renderedAlbum = Mustache.render(thumbnailTemplate, photos);
      var $thumbnails = $(renderedAlbum);
      // console.log($album);
      $container.masonryImagesReveal($thumbnails);

    });

  initPhotoSwipeFromDOM('.album');

  })
});

$.fn.masonryImagesReveal = function($thumbnails) {
  var msnry = this.data('masonry');
  var itemSelector = msnry.options.itemSelector;

  $thumbnails.hide();
  this.append( $thumbnails );
  $thumbnails.imagesLoaded().progress( function( imgLoad, image ) {
    // get item
    // image is imagesLoaded class, not <img>, <img> is image.img
    var $item = $( image.img ).parents( itemSelector );
    // console.log($item);
    // un-hide item
    $item.show();

    // masonry does its thing
    msnry.appended( $item );
    msnry.layout();
  });

  return this;
}

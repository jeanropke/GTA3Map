Object.defineProperty(String.prototype, 'filename', {
  value: function (extension) {
    let s = this.replace(/\\/g, '/');
    s = s.substring(s.lastIndexOf('/') + 1);
    return extension ? s.replace(/[?#].+$/, '') : s.split('.')[0];
  },
});

Object.defineProperty(String.prototype, 'includesOneOf', {
  value: function (...elements) {
    var include = false;
    for (var str of elements) {
      if (this.includes(str)) {
        include = true;
        break;
      }
    }
    return include;
  },
});

Object.defineProperty(Number.prototype, 'mod', {
  value: function (num) {
    return ((this % num) + num) % num;
  },
});


$(function () {
  try {
    init();
  } catch (e) {
    if (getParameterByName('show-alert') === '1') {
      alert(e);
    }
    console.error(e);
  }
});

function init() {
  try {
    Sentry.init({ release: nocache, tracesSampleRate: isLocalHost() ? 1 : 0.3 });
  } catch (err) {
    console.log(`Sentry: ${err}`);
  }

  const navLang = navigator.language;
  SettingProxy.addSetting(Settings, 'language', {
    default: Language.availableLanguages.includes(navLang) ? navLang : 'en',
  });


  Menu.init();
  MapBase.init();
  Language.init();
  Language.setMenuLanguage();

  changeCursor();
  Pins.init();

  const collectables = Collectable.init();
  const locations = Location.init();

  Promise.all([collectables, locations])
    .then(() => {
      Loader.resolveMapModelLoaded();
      MapBase.afterLoad();
    });

  if (Settings.isMenuOpened)
    $('.menu-toggle').click();

  $('#language').val(Settings.language);
  $('#marker-opacity').val(Settings.markerOpacity);
  $('#marker-size').val(Settings.markerSize);
  $('#marker-cluster').prop('checked', Settings.isMarkerClusterEnabled);
  $('#tooltip').prop('checked', Settings.showTooltips);
  $('#tooltip-map').prop('checked', Settings.showTooltipsMap);
  $('#enable-marker-popups-hover').prop('checked', Settings.isPopupsHoverEnabled);
  $('#enable-marker-shadows').prop('checked', Settings.isShadowsEnabled);
  $('#enable-dclick-zoom').prop('checked', Settings.isDoubleClickZoomEnabled);
  $('#show-help').prop('checked', Settings.showHelp);
  $('#show-coordinates').prop('checked', Settings.isCoordsOnClickEnabled);
  $('#enable-debug').prop('checked', Settings.isDebugEnabled);
  $('#enable-right-click').prop('checked', Settings.isRightClickEnabled);

  $('#help-container').toggle(Settings.showHelp);

  $('#show-customization').prop('checked', Settings.showCustomizationSettings);
  $('#show-import-export').prop('checked', Settings.showImportExportSettings);
  $('#show-debug').prop('checked', Settings.showDebugSettings);

  $('#customization-container').toggleClass('opened', Settings.showCustomizationSettings);
  $('#import-export-container').toggleClass('opened', Settings.showImportExportSettings);
  $('#debug-container').toggleClass('opened', Settings.showDebugSettings);
}

function isLocalHost() {
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

function changeCursor() {
  if (Settings.isCoordsOnClickEnabled)
    $('.leaflet-grab').css('cursor', 'pointer');
  else {
    $('.leaflet-grab').css('cursor', 'grab');
    $('.lat-lng-container').css('display', 'none');
  }
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Simple download function
function downloadAsFile(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

$('.side-menu').on('scroll', function () {
  // These are not equality checks because of mobile weirdness.
  const atTop = $(this).scrollTop() <= 0;
  const atBottom = $(this).scrollTop() + $(document).height() >= $(this).prop('scrollHeight');
  $('.scroller-line-tp').toggle(atTop);
  $('.scroller-arrow-tp').toggle(!atTop);
  $('.scroller-line-bt').toggle(atBottom);
  $('.scroller-arrow-bt').toggle(!atBottom);
});

$('#enable-right-click').on('change', function () {
  Settings.isRightClickEnabled = $('#enable-right-click').prop('checked');
});

$('#show-customization').on('change', function () {
  Settings.showCustomizationSettings = $('#show-customization').prop('checked');
  $('#customization-container').toggleClass('opened', Settings.showCustomizationSettings);
});

$('#show-import-export').on('change', function () {
  Settings.showImportExportSettings = $('#show-import-export').prop('checked');
  $('#import-export-container').toggleClass('opened', Settings.showImportExportSettings);
});

$('#show-debug').on('change', function () {
  Settings.showDebugSettings = $('#show-debug').prop('checked');
  $('#debug-container').toggleClass('opened', Settings.showDebugSettings);
});

$('#language').on('change', function () {
  Settings.language = $('#language').val();
  Language.setMenuLanguage();

  Collectable.onLanguageChanged();
  Location.onLanguageChanged();

  MapBase.updateTippy('language');
});

$('#marker-size').on('change', function () {
  Settings.markerSize = Number($('#marker-size').val());

  Collectable.onSettingsChanged();
  Location.onSettingsChanged();

  Pins.loadPins();
});

$('#marker-opacity').on('change', function () {
  Settings.markerOpacity = Number($('#marker-opacity').val());

  Collectable.onSettingsChanged();
  Location.onSettingsChanged();

  Pins.loadPins();
});

$('#tooltip').on('change', function () {
  Settings.showTooltips = $('#tooltip').prop('checked');
  Menu.updateTippy();
});

$('#tooltip-map').on('change', function () {
  Settings.showTooltipsMap = $('#tooltip-map').prop('checked');
  MapBase.updateTippy('tooltip');
});

$('#marker-cluster').on('change', function () {
  Settings.isMarkerClusterEnabled = $('#marker-cluster').prop('checked');

  Layers.oms.clearMarkers();

  Collectable.onSettingsChanged();
  Location.onSettingsChanged();

  Pins.loadPins();
});

$('#enable-marker-popups-hover').on('change', function () {
  Settings.isPopupsHoverEnabled = $('#enable-marker-popups-hover').prop('checked');
});

$('#enable-marker-shadows').on('change', function () {
  Settings.isShadowsEnabled = $('#enable-marker-shadows').prop('checked');

  Collectable.onSettingsChanged();
  Location.onSettingsChanged();

  Pins.loadPins();
});

$('#enable-dclick-zoom').on('change', function () {
  Settings.isDoubleClickZoomEnabled = $('#enable-dclick-zoom').prop('checked');
  if (Settings.isDoubleClickZoomEnabled) {
    MapBase.map.doubleClickZoom.enable();
  } else {
    MapBase.map.doubleClickZoom.disable();
  }
});

$('#show-help').on('change', function () {
  Settings.showHelp = $('#show-help').prop('checked');
  $('#help-container').toggle(Settings.showHelp);
});

$('#show-coordinates').on('change', function () {
  Settings.isCoordsOnClickEnabled = $('#show-coordinates').prop('checked');
  changeCursor();
});

$('#enable-debug').on('change', function () {
  Settings.isDebugEnabled = $('#enable-debug').prop('checked');
});

//Open collection submenu
$('.open-submenu').on('click', function (e) {
  e.stopPropagation();
  $(this).parent().parent().children('.menu-hidden').toggleClass('opened');
  $(this).toggleClass('rotate');
});

$('.submenu-only').on('click', function (e) {
  e.stopPropagation();
  $(this).parent().children('.menu-hidden').toggleClass('opened');
  $(this).children('.open-submenu').toggleClass('rotate');
});

//Open & close side menu
$('.menu-toggle').on('click', function () {
  $('.side-menu').toggleClass('menu-opened');
  Settings.isMenuOpened = $('.side-menu').hasClass('menu-opened');
  $('.menu-toggle').text(Settings.isMenuOpened ? 'X' : '>');
  $('.top-widget').toggleClass('top-widget-menu-opened', Settings.isMenuOpened);
  $('#fme-container').toggleClass('fme-menu-opened', Settings.isMenuOpened);
});

$(document).on('contextmenu', function (e) {
  if (!Settings.isRightClickEnabled) e.preventDefault();
});

$('#delete-all-settings').on('click', function () {
  $.each(localStorage, function (key) {
    if (key.startsWith('gta3.'))
      localStorage.removeItem(key);
  });

  location.reload(true);
});

$('#reload-map').on('click', function () {
  location.reload(true);
});

/**
 * Modals
 */

$('#open-delete-all-settings-modal').on('click', function () {
  $('#delete-all-settings-modal').modal();
});

/**
 * Leaflet plugins
 */
L.DivIcon.DataMarkup = L.DivIcon.extend({
  _setIconStyles: function (img, name) {
    L.DivIcon.prototype._setIconStyles.call(this, img, name);

    if (this.options.marker)
      img.dataset.marker = this.options.marker;

    if (this.options.category)
      img.dataset.category = this.options.category;

    if (this.options.tippy)
      img.dataset.tippy = this.options.tippy;

  },
});

L.LayerGroup.include({
  getLayerById: function (id) {
    for (var i in this._layers) {
      if (this._layers[i].id === id) {
        return this._layers[i];
      }
    }
  },
});

// Glowing icon (legendary animals)
L.Icon.TimedData = L.Icon.extend({
  _setIconStyles: function (img, name) {
    L.Icon.prototype._setIconStyles.call(this, img, name);
    if (this.options.time && this.options.time !== []) {
      img.dataset.time = this.options.time;
    }
  },
});

$('#cookie-export').on('click', function () {
  try {
    var cookies = $.cookie();
    var storage = localStorage;

    // Remove irrelevant properties (permanently from localStorage):
    delete cookies['_ga'];
    delete storage['randid'];
    delete storage['inventory'];

    // TODO: Need to more differentiate settings form RDO and Collectors map, to don't add hundreds of settings to this list (add prefix or sth)
    // Remove irrelevant properties (from COPY of localStorage, only to do not export them):
    storage = $.extend(true, {}, localStorage);
    delete storage['pinned-items'];
    delete storage['gta3.pinned-items'];
    delete storage['routes.customRoute'];
    delete storage['importantItems'];
    delete storage['enabled-categories'];

    for (var key in storage) {
      if (!key.startsWith('gta3.')) {
        delete storage[key];
      }
    }

    var settings = {
      'cookies': cookies,
      'local': storage,
    };

    var settingsJson = JSON.stringify(settings, null, 4);
    var exportDate = new Date().toISOUTCDateString();

    downloadAsFile(`GTA3-map-settings-(${exportDate}).json`, settingsJson);
  } catch (error) {
    console.error(error);
    alert(Language.get('alerts.feature_not_supported'));
  }
});

function setSettings(settings) {
  $.each(settings.cookies, function (key, value) {
    $.cookie(key, value, { expires: 999 });
  });

  $.each(settings.local, function (key, value) {
    localStorage.setItem(key, value);
  });

  location.reload();
}

$('#cookie-import').on('click', function () {
  try {
    var settings = null;
    var file = $('#cookie-import-file').prop('files')[0];
    var fallback = false;

    if (!file) {
      alert(Language.get('alerts.file_not_found'));
      return;
    }

    try {
      file.text().then((text) => {
        try {
          settings = JSON.parse(text);
          setSettings(settings);
        } catch (error) {
          alert(Language.get('alerts.file_not_valid'));
          return;
        }
      });
    } catch (error) {
      fallback = true;
    }

    if (fallback) {
      var reader = new FileReader();

      reader.addEventListener('loadend', (e) => {
        var text = e.srcElement.result;

        try {
          settings = JSON.parse(text);
          setSettings(settings);
        } catch (error) {
          alert(Language.get('alerts.file_not_valid'));
          return;
        }
      });

      reader.readAsText(file);
    }
  } catch (error) {
    console.error(error);
    alert(Language.get('alerts.feature_not_supported'));
  }
});

function linear(value, iMin, iMax, oMin, oMax) {
  const clamp = (num, min, max) => {
    return num <= min ? min : num >= max ? max : num;
  };
  return clamp((((value - iMin) / (iMax - iMin)) * (oMax - oMin) + oMin), oMin, oMax);
}

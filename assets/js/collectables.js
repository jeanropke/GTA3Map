class Collectable {
  static init() {
    this.quickParams = [];
    this.locations = [];
    this.context = $('#menu-container');

    return Loader.promises['collectables'].consumeJson(data => {
      data.forEach(item => {
        this.locations.push(new Collectable(item));
        this.quickParams.push(item.key);
      });
      console.info('%c[Collectables] Loaded!', 'color: #bada55; background: #242424');
    });
  }

  constructor(preliminary) {
    Object.assign(this, preliminary);

    this.layer = L.layerGroup();

    this.onLanguageChanged();

    this.element = $(`<div class="menu-option clickable" data-help="item_category" data-type="${this.key}">`)
      .toggleClass('disabled', !this.onMap)
      .on('click', () => this.onMap = !this.onMap)
      .append($('<span>')
        .append(
          $(`<img class="icon" src="./assets/images/icons/${this.key}.png">`))
        .append($('<span class="menu-option-text">').attr('data-text', `menu.${this.key}`)))
      .translate();

    this.element.appendTo(Collectable.context);

    if (this.onMap)
      this.layer.addTo(MapBase.map);
  }

  onLanguageChanged() {
    this.markers = [];
    this.locations.forEach(item => this.markers.push(new Marker(item.key, item.x, item.y, this.key, item.time)));

    this.reinitMarker();
  }

  reinitMarker() {
    this.layer.clearLayers();
    this.markers.forEach(marker => {
      const shadow = Settings.isShadowsEnabled ?
        `<img class="shadow" width="${35 * Settings.markerSize}" height="${16 * Settings.markerSize}" src="./assets/images/markers-shadow.png" alt="Shadow">` : '';
      var tempMarker = L.marker([marker.lat, marker.lng], {
        opacity: marker.isCollected ? .25 : Settings.markerOpacity,
        icon: new L.DivIcon.DataMarkup({
          iconSize: [35 * Settings.markerSize, 45 * Settings.markerSize],
          iconAnchor: [17 * Settings.markerSize, 42 * Settings.markerSize],
          popupAnchor: [1 * Settings.markerSize, -29 * Settings.markerSize],
          html: `<div>
              <img class="icon" src="assets/images/icons/${this.key}.png" alt="Icon">
              <img class="background" src="assets/images/icons/marker_${MapBase.colorOverride || this.color}.png" alt="Background">
              ${shadow}
            </div>`,
          marker: marker.text,
          tippy: marker.title,
          time: marker.subdata,
        }),
      });

      if(this.collectable)
        tempMarker.bindPopup(marker.updateMarkerContent.bind(marker, () => { marker.isCollected = !marker.isCollected; tempMarker.setOpacity(marker.isCollected ? .25 : 1); }), { minWidth: 300, maxWidth: 400 });
      else      
        tempMarker.bindPopup(marker.updateMarkerContent.bind(marker, () => { this.onMap = false; console.log(this) }), { minWidth: 300, maxWidth: 400 });
        
      this.layer.addLayer(tempMarker);
      if (Settings.isMarkerClusterEnabled)
        Layers.oms.addMarker(tempMarker);
    });
  }

  set onMap(state) {
    if (state) {
      this.layer.addTo(MapBase.map);
      this.element.removeClass('disabled');
      if (!MapBase.isPreviewMode)
        localStorage.setItem(`gta3.${this.key}`, 'true');
    } else {
      this.layer.remove();
      this.element.addClass('disabled');
      if (!MapBase.isPreviewMode)
        localStorage.setItem(`gta3.${this.key}`, 'false');
    }
    MapBase.updateTippy('collectable');
  }

  get onMap() {
    const value = JSON.parse(localStorage.getItem(`gta3.${this.key}`));
    return value || (value == null && !this.disabled);
  }

  static onLanguageChanged() {
    Collectable.locations.forEach(location => location.onLanguageChanged());
  }

  static onSettingsChanged() {
    Collectable.locations.forEach(location => location.reinitMarker());
  }
}

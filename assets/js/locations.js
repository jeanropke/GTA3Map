class Location {
  static init() {
    this.locations = [];
    this.quickParams = [];

    return Loader.promises['locations'].consumeJson(data => {
      data.forEach(items => {
        items.data.forEach(item => this.locations.push(new Location(item, items.category)));
      });
      console.info('%c[Locations] Loaded!', 'color: #bada55; background: #242424');
      Menu.reorderMenu(this.context);
    });
  }

  constructor(preliminary, category) {
    Object.assign(this, preliminary);

    this.category = category;
    this.keyIcon = this.category == 'weapons' ? 'ammunations' : this.key;

    this.layer = L.layerGroup();

    this.onLanguageChanged();

    this.element = $(`<div class="collectible-wrapper" data-help="item" data-type="${this.key}">`)
      .attr('data-tippy-content', Language.get(`map.${this.category}.${this.key}.name`))
      .on('click', () => this.onMap = !this.onMap)
      .append($(`<img class="collectible-icon" src="./assets/images/icons/${this.keyIcon}.png">`))
      .append($('<span class="collectible-text">')
        .toggleClass('disabled', !this.onMap)
        .append($('<p class="collectible">').attr('data-text', `map.${this.category}.${this.key}.name`)))
      .translate();

    this.element.appendTo($(`.menu-hidden[data-type=${category}]`));

    if (this.onMap)
      this.layer.addTo(MapBase.map);
  }

  onLanguageChanged() {
    this.markers = [];
    this.locations.forEach(item => this.markers.push(new Marker(item.text, item.x, item.y, this.category, this.key)));

    this.reinitMarker();
  }

  reinitMarker() {
    this.layer.clearLayers();
    this.markers.forEach(
      marker => {
        const shadow = Settings.isShadowsEnabled ?
          `<img class="shadow" width="${35 * Settings.markerSize}" height="${16 * Settings.markerSize}" src="./assets/images/markers-shadow.png" alt="Shadow">` : '';
        var tempMarker = L.marker([marker.lat, marker.lng], {
          opacity: Settings.markerOpacity,
          icon: new L.DivIcon.DataMarkup({
            iconSize: [35 * Settings.markerSize, 45 * Settings.markerSize],
            iconAnchor: [17 * Settings.markerSize, 42 * Settings.markerSize],
            popupAnchor: [1 * Settings.markerSize, -29 * Settings.markerSize],
            html: `<div>
                  <img class="icon" src="assets/images/icons/${this.keyIcon}.png" alt="Icon">
                  <img class="background" src="assets/images/icons/marker_${MapBase.colorOverride || this.color}.png" alt="Background">
                  ${shadow}
                </div>`,
            marker: this.key,
            tippy: marker.title,
          }),
        });
        tempMarker.bindPopup(marker.updateMarkerContent.bind(marker, () => this.onMap = false), { minWidth: 300, maxWidth: 400 });

        this.layer.addLayer(tempMarker);
        if (Settings.isMarkerClusterEnabled)
          Layers.oms.addMarker(tempMarker);
      }
    );
  }

  set onMap(state) {
    if (state) {
      this.layer.addTo(MapBase.map);
      this.element.children('span').removeClass('disabled');
      if (!MapBase.isPreviewMode)
        localStorage.setItem(`gta3.${this.category}.${this.key}`, 'true');
    } else {
      this.layer.remove();
      this.element.children('span').addClass('disabled');
      if (!MapBase.isPreviewMode)
        localStorage.removeItem(`gta3.${this.category}.${this.key}`);
    }
    MapBase.updateTippy(this.category);
  }
  get onMap() {
    return !!localStorage.getItem(`gta3.${this.category}.${this.key}`);
  }

  static onLanguageChanged() {
    Location.locations.forEach(loc => loc.onLanguageChanged());
    Menu.reorderMenu(this.context);
  }

  static onSettingsChanged() {
    Location.locations.forEach(loc => loc.reinitMarker());
  }
}

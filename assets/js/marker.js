class Marker {
  constructor(text, lat, lng, category, subdata, size) {
    this.text = text;
    this.lat = lat;
    this.lng = lng;
    this.category = category;
    this.subdata = subdata;
    this.size = size;
    this._collectedKey = `gta3.collected.${this.text}`;
    this.title = (() => {
      switch (category) {
        case 'hidden_packages':
        case 'rampage':
        case 'unique_stunt':
        case 'locations':
        case 'challanges':
          return Language.get(`map.${this.category}.${this.text}.name`);
        case 'weapons':
          return Language.get(`map.${this.category}.${this.subdata}.name`);
        default:
          return Language.get(`map.${this.category}.name`);
      }
    })();
    this.description = (() => {
      switch (category) {
        case 'hidden_packages':
        case 'rampage':
        case 'unique_stunt':
        case 'challanges':
          return Language.get(`map.${this.category}.${this.text}.desc`);
        case 'locations':
        case 'weapons':
          return Language.get(`map.${this.category}.${this.subdata}.desc`);
        default:
          return Language.get(`map.${this.category}.desc`);
      }
    })();
    this.secondatyDescription = (() => {
      switch (this.category) {
        case 'hidden_packages':
          return Language.get('map.hidden_packages.help');
        default:
          return '';
      }
    })();
  }

  get isCollected() {
    return !!localStorage.getItem(this._collectedKey);
  }

  set isCollected(value) {
    if (value) {
      localStorage.setItem(this._collectedKey, 'true');
    } else {
      localStorage.removeItem(this._collectedKey);
    }
  }

  updateMarkerContent(removeFromMapCallback) {
    const linksElement = $('<p>');
    return $(`
      <div>
        <h1>${this.title}</h1>
        <span class="marker-content-wrapper">
          <div>
            <p class="primary-description">${this.description}</p>
            <p class="secondary-description">${this.secondatyDescription}</p>
          </div>
        </span>
        ${linksElement.prop('outerHTML')}
        <button class="btn btn-default full-popup-width" data-text="map.remove"></button>
        <small>Text: ${this.text} / Latitude: ${this.lat} / Longitude: ${this.lng}</small>
      </div>
    `)
      .translate()
      .find('button')
      .on('click', removeFromMapCallback)
      .end()
      .find('small')
      .toggle(Settings.isDebugEnabled)
      .end()[0];
  }
}

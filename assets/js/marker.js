class Marker {
  constructor(text, lat, lng, category, subdata, size) {
    this.text = text;
    this.lat = lat;
    this.lng = lng;
    this.category = category;
    this.subdata = subdata;
    this.size = size;
    const collectedId = category === 'rampage' ? text.replace(/_f$/, '') : text;
    this._collectedKey = `gta3.collected.${collectedId}`;
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

  getGarageProgressContent() {
    if (this.category !== 'locations' || this.subdata !== 'garages') return '';
    const vehicles = Save.getGarageVehicles(this.text);
    if (!vehicles) return '';
    let progress;
    try {
      progress = JSON.parse(localStorage.getItem('gta3.import-export'));
    } catch {
      progress = null;
    }
    const mask = progress && progress[this.text];
    if (!Number.isInteger(mask) || mask < 0 || mask >= 2 ** vehicles.length) {
      return '<p class="garage-progress-hint">' + Language.get('map.garages.import_save_hint') + '</p>';
    }
    const delivered = vehicles.filter((vehicle, index) => (mask & (1 << index)) !== 0).length;
    const rows = vehicles.map((vehicle, index) => {
      const done = (mask & (1 << index)) !== 0;
      const status = Language.get(done ? 'map.garages.delivered' : 'map.garages.pending');
      return '<li class="' + (done ? 'delivered' : 'pending') + '"><span aria-hidden="true">' +
        (done ? '&#10003;' : '&#9675;') + '</span><span class="sr-only">' + status + ': </span>' + vehicle + '</li>';
    }).join('');
    return '<div class="garage-progress"><p><strong>' + delivered + ' / ' + vehicles.length + ' ' +
      Language.get('map.garages.vehicles_delivered') + '</strong></p><ul>' + rows + '</ul></div>';
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
        ${this.getGarageProgressContent()}
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

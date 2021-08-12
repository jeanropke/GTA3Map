class Menu {
  static init() {
    this.tippyInstances = [];
    Loader.mapModelLoaded.then(this.activateHandlers.bind(this));
  }

  static reorderMenu(menu) {
    $(menu).children().sort(function (a, b) {
      return a.textContent.toLowerCase().localeCompare(b.textContent.toLowerCase());
    }).appendTo(menu);

    if ($(menu).children('.new').length > 0)
      $(`[data-type=${$(menu).attr('data-type')}]`).toggleClass('new', true);

  }

  static activateHandlers() {

    const help = document.getElementById('help-container');
    const $helpParagraph = $(help).children('p');
    $('.side-menu, .top-widget, .lat-lng-container')
      .on('mouseover mouseout', event => {
        const target = event.type === 'mouseover' ? event.target : event.relatedTarget;

        // keep current help if pointer jumped to help container or it overgrew current pointer pos.
        if (help.contains(target)) return;
        const helpTransId = $(target).closest('[data-help]').attr('data-help') || 'default';
        $helpParagraph.html(Language.get(`help.${helpTransId}`));
      });

    $('.menu-hide-all').on('click', function () {
      Collectable.locations.forEach(_col => {
        if (_col.onMap) _col.onMap = !_col.onMap;
      });
      Location.locations.forEach(_loc => {
        if (_loc.onMap) _loc.onMap = !_loc.onMap;
      });
      Pins.onMap = false;
    });

    $('.menu-show-all').on('click', function () {
      Collectable.locations.forEach(_col => {
        if (!_col.onMap) _col.onMap = !_col.onMap;
      });
      Location.locations.forEach(_loc => {
        if (!_loc.onMap) _loc.onMap = !_loc.onMap;
      });
      Pins.onMap = true;
    });

    $('.locations-hide-btn').on('click', function () {
      Location.locations.forEach(_loc => {
        if (_loc.onMap && _loc.category == $(this).closest('.menu-hidden').data('type')) _loc.onMap = !_loc.onMap;
      });
    });
    $('.locations-show-btn').on('click', function () {
      Location.locations.forEach(_loc => {
        if (!_loc.onMap && _loc.category == $(this).closest('.menu-hidden').data('type')) _loc.onMap = !_loc.onMap;
      });
    });
  }

  static updateTippy() {
    Menu.tippyInstances.forEach(instance => instance.destroy());
    Menu.tippyInstances = [];

    if (!Settings.showTooltips) return;

    Menu.tippyInstances = tippy('[data-tippy-content]');
  }
}

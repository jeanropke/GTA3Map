const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
    const stored = new Map();
    const ctx = {
        console, Language: {get: key => key},
        localStorage: {
            getItem: key => stored.get(key) || null,
            setItem: (key, value) => stored.set(key, value),
            removeItem: key => stored.delete(key)
        },
        Settings: {isShadowsEnabled: false, markerOpacity: 1, isMarkerClusterEnabled: false},
        MapBase: {}, Layers: {},
        L: {
            marker: (position, options) => ({options, bindPopup() {}, on() {}}),
            DivIcon: {DataMarkup: class {}}
        }
    };
    vm.createContext(ctx);
    for (const [file, name] of [['save', 'Save'], ['marker', 'Marker'], ['collectables', 'Collectable']]) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/', file + '.js'), 'utf8') +
            ';globalThis.' + name + 'Class = ' + name + ';', ctx);
    }
    vm.runInContext('globalThis.Reader = Gta3SaveReader;', ctx);
    return ctx;
}

function fixture(ctx, variableSize = 17252) {
    const script = Buffer.alloc(204 + variableSize);
    script.write('SCR\0', 192, 'latin1');
    script.writeUInt32LE(variableSize, 200);
    script.set([2, 0, 1], 204);
    script.writeUInt32LE(variableSize, 207);
    const stats = Buffer.alloc(424);
    stats.writeUInt32LE(420, 0);
    stats.writeInt32LE(20, 184);
    const payloads = Array.from({length: 18}, (_, index) => index === 0 ? script : index === 17 ? stats : Buffer.alloc(4));
    const serialized = Buffer.concat(payloads.map(data => {
        const size = Buffer.alloc(4);
        size.writeUInt32LE(data.length);
        return Buffer.concat([size, data]);
    }));
    const reader = new ctx.Reader(serialized.buffer.slice(serialized.byteOffset, serialized.byteOffset + serialized.byteLength));
    return {reader, variables: new DataView(reader.blocks[0].data, 204), stats: new DataView(reader.blocks[17].data)};
}

test('each original USJ flag maps to the corresponding map location', () => {
    const ctx = setup();
    // Script ID -> marker ID, checked against the original jump trigger coordinates.
    const expected = {1: 2, 2: 4, 3: 8, 4: 10, 5: 5, 6: 6, 7: 7, 8: 19, 9: 18, 10: 3,
        11: 1, 12: 12, 13: 9, 14: 11, 15: 20, 16: 17, 17: 16, 18: 15, 19: 14, 20: 13};
    for (const [scriptId, markerId] of Object.entries(expected)) {
        const {reader, variables, stats} = fixture(ctx);
        variables.setInt32(3132 + (Number(scriptId) - 1) * 4, 1, true);
        stats.setInt32(180, 1, true);
        const progress = reader.readBaseProgress().unique_stunt;
        assert.deepEqual(Object.keys(progress).filter(key => progress[key]), ['unique_stunt_' + markerId]);
    }
});

test('off-road times and RC scores mark only the matching challenge complete', () => {
    const ctx = setup();
    const records = [
        ['challange_1', 228], ['challange_2', 352], ['challange_3', 348], ['challange_4', 356],
        ['challange_5', 240], ['challange_6', 232], ['challange_7', 236], ['challange_8', 360]
    ];
    for (const [key, offset] of records) {
        const {reader, stats} = fixture(ctx);
        stats.setInt32(offset, 1, true);
        const progress = reader.readBaseProgress().challanges;
        assert.deepEqual(Object.keys(progress).filter(key => progress[key]), [key]);
    }
    const {reader} = fixture(ctx);
    assert.equal(Object.values(reader.readBaseProgress().challanges).some(Boolean), false);
});

test('unsupported scripts and inconsistent or truncated stats are rejected', () => {
    const ctx = setup();
    let {reader, stats} = fixture(ctx);
    stats.setInt32(180, 1, true);
    assert.throws(() => reader.readBaseProgress(), /do not match/);
    ({reader} = fixture(ctx));
    new DataView(reader.blocks[0].data).setUint32(200, 19000, true);
    assert.equal(reader.hasSupportedProgressLayout(), false);
    assert.throws(() => reader.readBaseProgress(), /Unsupported/);
    ({reader} = fixture(ctx));
    reader.blocks[17].data = new ArrayBuffer(24);
    assert.throws(() => reader.readBaseProgress(), /Invalid stats/);
});

test('import persists progress, fades completed markers and restores an older save', () => {
    const ctx = setup();
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/base/collectables.json'), 'utf8'));
    const groups = ['unique_stunt', 'challanges'].map(key => {
        const group = Object.create(ctx.CollectableClass.prototype);
        Object.assign(group, {
            key, collectable: true,
            markers: data.find(entry => entry.key === key).locations.map(loc => new ctx.MarkerClass(loc.key, loc.x, loc.y, key)),
            layer: {layers: [], clearLayers() {this.layers = [];}, addLayer(marker) {this.layers.push(marker);}}
        });
        return group;
    });
    ctx.CollectableClass.locations = groups;
    const {reader, variables, stats} = fixture(ctx);
    variables.setInt32(3172, 1, true); // USJ 11 -> marker 1.
    stats.setInt32(180, 1, true);
    stats.setInt32(352, 4, true); // Mafia Massacre -> challenge 2.
    ctx.SaveClass.importProgress(reader.readBaseProgress());
    assert.equal(groups[0].layer.layers.length, 20);
    assert.equal(groups[1].layer.layers.length, 8);
    assert.equal(groups[0].layer.layers[0].options.opacity, 0.25);
    assert.equal(groups[1].layer.layers[1].options.opacity, 0.25);
    assert(new ctx.MarkerClass('unique_stunt_1', 0, 0, 'unique_stunt').isCollected);
    const earlier = fixture(ctx).reader.readBaseProgress();
    ctx.SaveClass.importProgress(earlier);
    assert(groups.every(group => group.markers.every(marker => !marker.isCollected)));
    assert(groups.every(group => group.layer.layers.every(marker => marker.options.opacity === 1)));
});

test('known relocated script layout reads base-game jump flags without assuming vanilla offsets', () => {
    const ctx = setup();
    const {reader, variables, stats} = fixture(ctx, 18952);
    variables.setInt32(1996, 1, true); // Script USJ 3, relocated flags -> map marker 8.
    stats.setInt32(180, 1, true);
    assert.equal(reader.hasSupportedProgressLayout(), true);
    const progress = reader.readBaseProgress().unique_stunt;
    assert.deepEqual(Object.keys(progress).filter(key => progress[key]), ['unique_stunt_8']);
});

function garageFixture(ctx, emergency = 0, portland = 0, shoreside = 0) {
    const {reader} = fixture(ctx);
    const garages = new ArrayBuffer(40);
    const crane = new ArrayBuffer(16);
    new DataView(garages).setUint32(0, 36, true);
    new DataView(garages).setUint32(28, portland, true);
    new DataView(garages).setUint32(32, shoreside, true);
    new DataView(crane).setUint32(0, 12, true);
    new DataView(crane).setUint32(8, emergency, true);
    reader.blocks[2].data = garages;
    reader.blocks[6].data = crane;
    return reader;
}

test('garage masks use separate blocks and preserve first and last vehicle bits', () => {
    const ctx = setup();
    const reader = garageFixture(ctx, 0x41, 0x8001, 0x8001);
    const progress = reader.readGarageProgress();
    assert.equal(progress.garage_1, 65);
    assert.equal(progress.garage_2, 32769);
    assert.equal(progress.garage_3, 32769);
    for (const [key, expected] of Object.entries({garage_1: ['Fire Truck', 'Police'],
        garage_2: ['Securicar', 'Pony'], garage_3: ['Sentinel', 'Esperanto']})) {
        const names = ctx.SaveClass.getGarageVehicles(key);
        const delivered = Array.from(names).filter((_, index) => progress[key] & (1 << index));
        assert.deepEqual(delivered, expected);
    }
    reader.blocks[6].data = new ArrayBuffer(4);
    assert.throws(() => reader.readGarageProgress(), /Invalid Import/);
});

test('garage popup distinguishes unknown, partial and completed progress', () => {
    const ctx = setup();
    const marker = new ctx.MarkerClass('garage_2', 0, 0, 'locations', 'garages');
    assert.match(marker.getGarageProgressContent(), /map.garages.import_save_hint/);
    ctx.localStorage.setItem('gta3.import-export', JSON.stringify({garage_2: 0x81}));
    const partial = marker.getGarageProgressContent();
    assert(partial.includes('2 / 16'));
    assert.match(partial, /class="delivered"[^]*Securicar/);
    assert.match(partial, /class="delivered"[^]*Mr. Whoopee/);
    assert.equal((partial.match(/class="delivered"/g) || []).length, 2);
    assert.equal((partial.match(/class="pending"/g) || []).length, 14);
    ctx.localStorage.setItem('gta3.import-export', JSON.stringify({garage_2: 65535}));
    assert(marker.getGarageProgressContent().includes('16 / 16'));
    ctx.localStorage.setItem('gta3.import-export', 'invalid JSON');
    assert.match(marker.getGarageProgressContent(), /map.garages.import_save_hint/);
    assert.equal(new ctx.MarkerClass('hidden_package_1', 0, 0, 'hidden_packages').getGarageProgressContent(), '');
});

test('garage progress persists and a subsequent import replaces the previous checklist', () => {
    const ctx = setup();
    let refreshes = 0;
    ctx.Location = {locations: [{category: 'locations', key: 'garages', reinitMarker() {refreshes++;}},
        {category: 'locations', key: 'health', reinitMarker() {assert.fail('Unrelated category refreshed');}}]};
    ctx.SaveClass.importGarageProgress(garageFixture(ctx, 127, 65535, 65535).readGarageProgress());
    const marker = new ctx.MarkerClass('garage_1', 0, 0, 'locations', 'garages');
    assert(marker.getGarageProgressContent().includes('7 / 7'));
    ctx.SaveClass.importGarageProgress(garageFixture(ctx).readGarageProgress());
    assert(marker.getGarageProgressContent().includes('0 / 7'));
    assert.equal(refreshes, 2);
});

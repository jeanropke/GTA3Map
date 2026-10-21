class Save {
    static init() {
        $('#save-import').on('click', () => Save.importFile($('#save-import-file').prop('files')[0]));
        let dragDepth = 0;
        const isFileDrag = event => Array.from(event.dataTransfer?.types || []).includes('Files');
        const clearDrag = () => {
            dragDepth = 0;
            document.body.classList.remove('save-drag-active');
        };
        document.addEventListener('dragenter', event => {
            if (!isFileDrag(event)) return;
            event.preventDefault();
            dragDepth++;
            document.body.dataset.saveDropLabel = Language.get('menu.drop_save');
            document.body.classList.add('save-drag-active');
        }, true);
        document.addEventListener('dragover', event => {
            if (!isFileDrag(event)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        }, true);
        document.addEventListener('dragleave', event => {
            if (!isFileDrag(event)) return;
            if (--dragDepth <= 0) clearDrag();
        }, true);
        document.addEventListener('drop', event => {
            if (!isFileDrag(event)) return;
            event.preventDefault();
            event.stopPropagation();
            clearDrag();
            const files = Array.from(event.dataTransfer.files);
            if (files.length !== 1 || !/\.b$/i.test(files[0].name)) {
                alert(Language.get('alerts.drop_save_file'));
                return;
            }
            Save.importFile(files[0]);
        }, true);
        window.addEventListener('blur', clearDrag);
    }

    static importFile(file) {
        try {
            if (!file) {
                alert(Language.get('alerts.file_not_found'));
                return;
            }

            const reader = new FileReader();

            reader.onload = async (e) => {
                const buffer = e.target.result;

                try {
                    await Loader.mapModelLoaded;
                    const save = new Gta3SaveReader(buffer);

                    if (!save.hasSupportedProgressLayout()) {
                        alert(Language.get('alerts.save_not_supported'));
                        return;
                    }
                    const progress = save.readBaseProgress();
                    const garages = save.readGarageProgress();
                    const pickups = save.readPickups();

                    const packages = Collectable.locations.find(group => group.key === 'hidden_packages');
                    if (!packages) throw new Error('Hidden packages category not loaded');
                    const markers = packages.markers;
                    const index = createSpatialIndex(pickups.filter(pickup => pickup.isHiddenPackage()));


                    markers.forEach(obj => {
                        const p = obj;

                        const key = `${p.lat.toFixed(1)}|${p.lng.toFixed(1)}`;
                        const match = index.get(key);

                        if (match) {
                            p.isCollected = match.collected;
                        }
                    });

                    packages.reinitMarker();
                    Save.importRampages(pickups);
                    Save.importProgress(progress);
                    Save.importGarageProgress(garages);


                } catch (error) {
                    console.error(error);
                    alert(Language.get('alerts.file_not_valid'));
                }
            };

            reader.onerror = () => alert(Language.get('alerts.file_not_valid'));
            reader.readAsArrayBuffer(file);

        } catch (error) {
            console.error(error);
            alert(Language.get('alerts.feature_not_supported'));
        }
    }

    static importRampages(pickups) {
        const rampages = Collectable.locations.find(group => group.key === 'rampage');
        if (!rampages) return;

        const pairs = new Map();
        rampages.markers.forEach(marker => {
            const key = marker.text.replace(/_f$/, '');
            if (!pairs.has(key)) pairs.set(key, []);
            pairs.get(key).push(marker);
        });

        const active = new Set();
        // A failed attempt removes the old pickup and creates one at the alternate
        // location. Only the absence of an active pickup at BOTH locations means done.
        pickups.filter(pickup => pickup.isRampage() && pickup.type === 3 && !pickup.collected)
            .forEach(pickup => {
                const lat = 0.0121 * pickup.y - 23.95;
                const lng = 0.012 * pickup.x + 24;
                const pair = [...pairs].find(([, markers]) => markers.some(marker =>
                    Math.hypot(marker.lat - lat, marker.lng - lng) < 0.01));
                if (!pair) throw new Error('Rampage pickup does not match the map locations');
                active.add(pair[0]);
            });

        pairs.forEach((markers, key) => {
            markers.forEach(marker => { marker.isCollected = !active.has(key); });
        });
        rampages.reinitMarker();
    }

    static importProgress(progress) {
        for (const key of ['unique_stunt', 'challanges']) {
            const group = Collectable.locations.find(group => group.key === key);
            if (!group) continue;
            group.markers.forEach(marker => {
                if (Object.prototype.hasOwnProperty.call(progress[key], marker.text)) {
                    marker.isCollected = progress[key][marker.text];
                }
            });
            group.reinitMarker();
        }
    }

    static getGarageVehicles(key) {
        const lists = {
            garage_1: ['Fire Truck', 'Ambulance', 'Enforcer', 'FBI Car', 'Rhino', 'Barracks OL', 'Police'],
            garage_2: ['Securicar', 'Moonbeam', 'Coach', 'Flatbed', 'Linerunner', 'Trashmaster', 'Patriot',
                'Mr. Whoopee', 'Blista', 'Mule', 'Yankee', 'Bobcat', 'Dodo', 'Bus', 'Rumpo', 'Pony'],
            garage_3: ['Sentinel', 'Cheetah', 'Banshee', 'Idaho', 'Infernus', 'Taxi', 'Kuruma', 'Stretch',
                'Perennial', 'Stinger', 'Manana', 'Landstalker', 'Stallion', 'BF Injection', 'Cabbie', 'Esperanto']
        };
        return lists[key];
    }

    static importGarageProgress(progress) {
        localStorage.setItem('gta3.import-export', JSON.stringify(progress));
        Location.locations.filter(group => group.category === 'locations' && group.key === 'garages')
            .forEach(group => group.reinitMarker());
    }

}

class SaveBlock {
    constructor(size, type, data, position) {
        this.size = size;
        this.type = type;
        this.data = data;
        this.position = position;
    }
}

class BinaryReader {
    constructor(buffer) {
        this.view = new DataView(buffer);
        this.offset = 0;
    }

    get position() {
        return this.offset;
    }

    seek(pos) {
        this.offset = pos;
    }

    readInt32() {
        const val = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return val;
    }

    readUInt32() {
        const val = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return val;
    }

    readUInt16() {
        const val = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return val;
    }

    readInt16() {
        const val = this.view.getInt16(this.offset, true);
        this.offset += 2;
        return val;
    }

    readByte() {
        const val = this.view.getUint8(this.offset);
        this.offset += 1;
        return val;
    }

    readBool() {
        return this.readByte() !== 0;
    }

    readFloat() {
        const val = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return val;
    }

    readBytes(length) {
        const slice = this.view.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return slice;
    }

    get length() {
        return this.view.byteLength;
    }
}

class Pickup {
    constructor(reader) {
        this.type = reader.readByte();
        this.collected = reader.readBool();
        this.ammo = reader.readUInt16();
        this.objectIndex = reader.readUInt32();
        this.regenTime = reader.readUInt32();
        this.modelId = reader.readInt16();
        this.flags = reader.readInt16();
        this.x = reader.readFloat();
        this.y = reader.readFloat();
        this.z = reader.readFloat();
    }

    isValid() {
        return this.type !== 0 || (this.collected && this.modelId !== 0);
    }

    isRampage() {
        return this.modelId === 1392;
    }

    isHiddenPackage() {
        return this.type === 5 || (this.type === 0 && this.collected && this.modelId === 1321);
    }
}

class Gta3SaveReader {
    constructor(buffer) {
        this.reader = new BinaryReader(buffer);
        this.blocks = this.readBlocks();
    }

    readBlocks() {
        const blocks = [];

        while (this.reader.length - this.reader.position >= 4) {
            const pos = this.reader.position;

            const size = this.reader.readInt32();
            // The fixed-size save ends with padding and a checksum, not another block.
            if (size <= 0 || size > this.reader.length - this.reader.position) break;
            const data = this.reader.readBytes(size);

            blocks.push(new SaveBlock(size, blocks.length, data, pos));
        }

        return blocks;
    }


    getBaseProgressLayout() {
        const block = this.blocks[0];
        if (!block || block.data.byteLength < 0xCC) return null;
        const view = new DataView(block.data);
        if (view.getUint32(0xC0, true) !== 0x00524353) return null;
        const variableSize = view.getUint32(0xC8, true);
        // Known script layouts. Only base-game activities are imported in either case.
        // This alternate PC script layout relocates the original USJ flags.
        const jumpFlags = new Map([[0x4364, 0xC3C], [0x4A08, 0x7C4]]).get(variableSize);
        if (jumpFlags === undefined || view.byteLength < 0xCC + variableSize ||
            view.getUint32(0xCC + 3, true) !== variableSize) return null;
        return { variableSize, jumpFlags };
    }

    hasSupportedProgressLayout() {
        return this.getBaseProgressLayout() !== null;
    }

    readBaseProgress() {
        const layout = this.getBaseProgressLayout();
        if (!layout) throw new Error('Unsupported GTA III script version');
        const variables = new DataView(this.blocks[0].data, 0xCC, layout.variableSize);
        const block = this.blocks[17];
        if (!block || block.data.byteLength < 424) throw new Error('Invalid stats block');
        const stats = new DataView(block.data);
        if (stats.getUint32(0, true) !== 420) throw new Error('Unsupported stats layout');

        // Map marker order differs from the USJ flag order in the original main.scm.
        const jumpIds = [11, 1, 10, 2, 5, 6, 7, 3, 13, 4, 14, 12, 20, 19, 18, 17, 16, 9, 8, 15];
        const unique_stunt = {};
        jumpIds.forEach((scriptId, index) => {
            const flag = variables.getInt32(layout.jumpFlags + (scriptId - 1) * 4, true);
            if (flag !== 0 && flag !== 1) throw new Error('Invalid unique stunt flag');
            unique_stunt['unique_stunt_' + (index + 1)] = flag === 1;
        });
        const completedJumps = Object.values(unique_stunt).filter(Boolean).length;
        if (stats.getInt32(180, true) !== completedJumps || stats.getInt32(184, true) !== 20) {
            throw new Error('Unique stunt flags do not match save statistics');
        }

        // Stats offsets include the 4-byte payload size. Off-road times and RC
        // high scores are written on success, not when starting or failing a challenge.
        const challengeOffsets = [228, 352, 348, 356, 240, 232, 236, 360];
        const challanges = {};
        challengeOffsets.forEach((offset, index) => {
            const record = stats.getInt32(offset, true);
            if (record < 0) throw new Error('Invalid challenge record');
            challanges['challange_' + (index + 1)] = record > 0;
        });
        return { unique_stunt, challanges };
    }

    readGarageProgress() {
        const garageBlock = this.blocks[2];
        const craneBlock = this.blocks[6];
        if (!garageBlock || garageBlock.data.byteLength < 36 ||
            !craneBlock || craneBlock.data.byteLength < 12) throw new Error('Invalid Import/Export blocks');
        const garages = new DataView(garageBlock.data);
        const cranes = new DataView(craneBlock.data);
        if (garages.getUint32(0, true) < 32 || garages.getUint32(0, true) > garages.byteLength - 4 ||
            cranes.getUint32(0, true) < 8 || cranes.getUint32(0, true) > cranes.byteLength - 4) {
            throw new Error('Invalid Import/Export block sizes');
        }
        // Payload size comes first. Garage masks follow six uint32 fields;
        // the emergency crane mask follows NumCranes in its own block.
        return {
            garage_1: cranes.getUint32(8, true) & 0x7F,
            garage_2: garages.getUint32(28, true) & 0xFFFF,
            garage_3: garages.getUint32(32, true) & 0xFFFF
        };
    }

    getPickupBlock() {
        return this.blocks.find(b => b.type === 7);
    }

    readPickups() {
        const block = this.getPickupBlock();
        if (!block) return [];

        const reader = new BinaryReader(block.data);

        const size = reader.readInt32();
        // The pickup array is followed by a 4-byte cursor/padding and 32 collected handles.
        const count = Math.floor((size - 132) / 0x1C);
        if (size > reader.length - 4 || count < 0) {
            throw new Error("Invalid pickup block size");
        }

        const pickups = [];

        for (let i = 0; i < count; i++) {
            const pickup = new Pickup(reader);
            if (pickup.isValid()) {
                pickups.push(pickup);
            }
        }

        return pickups;
    }

}
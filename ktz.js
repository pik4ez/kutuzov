function getElemById(id) {
    return document.getElementById(id);
}

document.body.addEventListener('keypress', handleKeyPress, false);

getElemById('file').addEventListener('change', handleFileSelect, false);
getElemById('container').addEventListener('click', handleClickOnOutput, false);
getElemById('settings-wpm').addEventListener('change', handleSettingsChange, false);
getElemById('settings-align').addEventListener('change', handleSettingsChange, false);
getElemById('settings-chunk-size').addEventListener('change', handleSettingsChange, false);
getElemById('settings-font-size').addEventListener('change', handleSettingsChange, false);

init();

// initializes application at startup
function init() {
    var config = new ktzConfig();
    applySettings(true)

    if(config.get('text')) {
        var container = getElemById('output');
        var iterator = new ktzIterator(config.get('text').split(/\s+/), 0);
        var drawer = new ktzDrawer(iterator, container);

        drawer();
    }

    var newMode = 'pause';
    if (config.get('mode') == 'select') {
        newMode = 'select';
    }
    switchMode(newMode);
}

// when mouse click on output text
function handleClickOnOutput(ev) {
    var config = new ktzConfig();

    var mode = config.get('mode');
    if (mode == 'play') {
        switchMode('pause');
    } else {
        switchMode('play');
    }
}

// when settings changed
function handleSettingsChange(ev) {
    var config = new ktzConfig();
    config.set('wpm', parseInt(getElemById('settings-wpm').value));
    config.set('align', getElemById('settings-align').value);
    config.set('fontSize', parseInt(getElemById('settings-font-size').value));
    config.set('chunkSize', parseInt(getElemById('settings-chunk-size').value));

    applySettings(true);
}

// read settings from config and apply it to player
function applySettings(updateInputs) {
    var config = new ktzConfig();

    // apply wpm: restart required if in play mode
    if (config.get('mode') == 'play') {
        switchMode('pause');
        switchMode('play');
    }

    // apply style settings (font size and text align)
    getElemById('output').style.textAlign = config.get('align');
    getElemById('output').style.fontSize = config.get('fontSize').toString() + "px";

    // set appropriate inputs values
    if (updateInputs) {
        getElemById('settings-wpm').value = config.get('wpm');
        getElemById('settings-font-size').value = config.get('fontSize');
        getElemById('settings-chunk-size').value = config.get('chunkSize');
        
        for (var i = 0; i < getElemById('settings-align').options.length; i++) {
            var opt = getElemById('settings-align').options[i];
            opt.selected = (opt.value == config.get('align'));
        }
    }
}

// when user presses keyboard key
function handleKeyPress(ev) {
    var config = new ktzConfig();

    switch (ev.keyCode) {
        // space: play/pause
        case 32:
            var mode = config.get('mode');
            if (mode == 'play') {
                switchMode('pause');
            } else {
                switchMode('play');
            }

            break;

        // h, ?: show help
        case 104:
        case 63:
            var msg = "Some help:\n\n" +
                      "space — play/pause\n" +
                      "up/down — change speed\n" +
                      "h or ? — show this help\n" +
                      "\nClick anywhere to play/pause.";

            alert(msg);

            break;

        // +, =: increase speed
        case 43:
        case 61:
            var newSpeed = parseInt(config.get('wpm')) + parseInt(config.get('wpmStep'));
            config.set('wpm', newSpeed);

            getElemById('settings-wpm').value = newSpeed;

            if (config.get('mode') == 'play') {
                switchMode('pause');
                switchMode('play');
            }

            break;

        // -, _: decrease speed
        case 45:
        case 95:
            var newSpeed = parseInt(config.get('wpm')) - parseInt(config.get('wpmStep'));
            if (newSpeed < parseInt(config.get('wpmStep'))) {
                newSpeed = config.get('wpmStep');
            }

            config.set('wpm', newSpeed);

            getElemById('settings-wpm').value = newSpeed;

            if (config.get('mode') == 'play') {
                switchMode('pause');
                switchMode('play');
            }

            break;
    }
}

// when user selects file
function handleFileSelect(ev) {
    var config = new ktzConfig();
    var file = ev.target.files[0]

    if (!file) {
        return;
    }

    if (file.type != 'text/plain') {
        alert('Kutuzov can\'t see anything except old plain text files.');
        return;
    }

    config.set('pos', 0);

    var reader = new FileReader();
    reader.onloadend = function(ev) { handleFileLoad(ev, reader) };
    reader.readAsText(file);
}

// when file load ends
function handleFileLoad(ev, reader) {
    var config = new ktzConfig();
    // @fixme do not store all the contents in localStorage
    config.set('text', reader.result);
    switchMode('play');
}

// play loaded text file
function play() {
    var config = new ktzConfig();
    var container = getElemById('output');
    var iterator = new ktzIterator(config.get('text').split(/\s+/), 0);
    var drawer = new ktzDrawer(iterator, container);

    var interval = setInterval(function () {
            if (!drawer()) {
                clearInterval(config.get('interval'));
                switchMode('select');
            }
    }, 60 / config.get('wpm') * 1000);

    config.set('interval', interval);
}

// switch between modes (play, pause, select file etc)
function switchMode(mode) {
    var config = new ktzConfig();

    switch(mode) {
        case 'play':
            getElemById('controls').style.display = 'none';
            play();
            config.set('mode', 'play');
            break;
        case 'pause':
            getElemById('controls').style.display = 'block';
            clearInterval(config.get('interval'));
            config.set('mode', 'pause');
            break;
        case 'select':
            getElemById('controls').style.display = 'block';
            config.set('mode', 'select');
            break;
    }
}

// handles persistent settings
function ktzConfig() {
    // play speed in words per minute
    this.wpm = 500;

    // wpm change step
    this.wpmStep = 20;

    // text align inside container
    this.align = 'center';

    // font size
    this.fontSize = 24;

    // chunk size (how many words to be displayed in one frame)
    this.chunkSize = 1;

    this.mode = 'pause';

    // get variable from application config
    this.get = function(key) {
        if(
            supportsLocalStorage() &&
            localStorage[key] !== undefined
        ) {
            return localStorage[key];
        } else {
            return this[key];
        }
    }

    // store variable in localStorage
    this.set = function(key, val) {
        if (!supportsLocalStorage) {
            return false;
        }

        localStorage[key] = val;
    }

    // delete variable from localStorage
    this.unset = function(key) {
        if (!supportsLocalStorage) {
            return false;
        }

        localStorage.removeItem(key);
    }
}

// checks if browser has localStorage support
function supportsLocalStorage() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
}

// loops through loaded text and gets the next chunk
function ktzIterator(arr) {
    this.arr = arr;
    this.len = arr.length;
    this.config = new ktzConfig();

    if (this.config.get('pos')== undefined) {
        this.config.set('pos', 0);
        this.config.unset('text');
    }

    this.next = function() {
        if (this.config.get('pos') >= this.len) {
            this.config.set('pos', 0);
            this.config.unset('text');
            return false;
        }

        var newPos = parseInt(this.config.get('pos')) + parseInt(this.config.get('chunkSize'));
        var result = this.arr.slice(
            this.config.get('pos'),
            newPos
        ).join(' ');

        this.config.set('pos', newPos);

        return result;
    }
}

// fills output container with current chunk of data
function ktzDrawer(iterator, container) {
    return function () {
        word = iterator.next();

        if (word == false) {
            return false;
        }

        container.textContent = word;

        return true;
    }
}


ktz = {}

// initializes application at startup
ktz.init = function () {
    ktz.config = new KtzConfig();

    ktz.ui.init();
    ktz.player = new KtzPlayer(ktz.config);

    ev.bind('chunk', function (chunk) {
        if (!ktz.player.playing) {
            return;
        }

        ktz.config.set('pos', parseInt(ktz.config.get('pos')) +
            chunk.split(/\s+/).length);
    });;

    ev.bind('file_load', function (reader) {
        // FIXME: do not store all the contents in localStorage
        ktz.config.set('text', reader.result);
        ktz.config.set('pos', 0);

        ev.fire('settings_change', ktz.config);
    });

    ev.bind('increase_speed', function () {
        var newSpeed = parseInt(ktz.config.get('wpm')) +
            parseInt(ktz.config.get('wpmStep'));
        ktz.config.set('wpm', newSpeed);

        ktz.ui.applySettings();

        ev.fire('settings_change', ktz.config);
    });

    ev.bind('decrease_speed', function () {
        var newSpeed = parseInt(ktz.config.get('wpm')) -
            parseInt(ktz.config.get('wpmStep'));
        if (newSpeed <= 0) {
            return;
        }

        ktz.config.set('wpm', newSpeed);

        ktz.ui.applySettings();

        ev.fire('settings_change', ktz.config);
    });
}

ktz.ui = {
    'file': getElementById('file'),
    'output': getElementById('output'),
    'container': getElementById('container'),
    'controls': getElementById('controls'),
    'settings': {
        'wpm': getElementById('settings-wpm'),
        'align': getElementById('settings-align'),
        'chunkSize': getElementById('settings-chunk-size'),
        'fontSize': getElementById('settings-font-size')
    }
}

ktz.ui.init = function () {
    var ui = ktz.ui;
    var handlers = ktz.ui.handlers;

    // FIXME: refactor this
    addEventListener(ui.file, 'change', handlers.onFileSelect);
    addEventListener(ui.container, 'click', handlers.onClickOnOutput);
    addEventListener(ui.settings.wpm, 'change', handlers.onSettingsChange);
    addEventListener(ui.settings.align, 'change', handlers.onSettingsChange);
    addEventListener(ui.settings.fontSize, 'change', handlers.onSettingsChange);
    addEventListener(ui.settings.chunkSize, 'change', handlers.onSettingsChange);

    addEventListener(document.body, 'keypress', handlers.onKeyPress);

    ui.applySettings();

    ev.bind('chunk', handlers.onNewChunk);
    ev.bind('toggle_mode', handlers.onToggleMode);
    ev.bind('show_help', handlers.onShowHelp);
}

ktz.ui.handlers = {}

ktz.ui.handlers.onNewChunk = function (chunk) {
    ktz.ui.output.textContent = chunk;
}

// when mouse click on output text
ktz.ui.handlers.onClickOnOutput = function () {
    ev.fire('toggle_mode');
}

ktz.ui.handlers.onShowHelp = function () {
    var msg = "Some help:\n\n" +
        "space — play/pause\n" +
        "up/down — change speed\n" +
        "h or ? — show this help\n" +
        "\nClick anywhere to play/pause.";

    alert(msg);
}

// when settings changed
ktz.ui.handlers.onSettingsChange = function () {
    ktz.config.set('wpm', parseInt(ktz.ui.settings.wpm.value));
    ktz.config.set('align', ktz.ui.settings.align.value);
    ktz.config.set('fontSize', parseInt(ktz.ui.settings.fontSize.value));
    ktz.config.set('chunkSize', parseInt(ktz.ui.settings.chunkSize.value));

    ktz.ui.applySettings();

    ev.fire('settings_change', ktz.config);
}

// read settings from config and apply it to player
ktz.ui.applySettings = function () {
    // apply style settings (font size and text align)
    ktz.ui.output.style.textAlign = ktz.config.get('align');
    ktz.ui.output.style.fontSize = ktz.config.get('fontSize').toString() + "px";

    ktz.ui.settings.wpm.value = ktz.config.get('wpm');
    ktz.ui.settings.fontSize.value = ktz.config.get('fontSize');
    ktz.ui.settings.chunkSize.value = ktz.config.get('chunkSize');

    for (var i = 0; i < ktz.ui.settings.align.options.length; i++) {
        var opt = ktz.ui.settings.align.options[i];
        opt.selected = (opt.value == ktz.config.get('align'));
    }
}

// when user presses keyboard key
ktz.ui.handlers.onKeyPress = function (e) {
    switch (e.keyCode) {
        // space: play/pause
        case 32:
            ev.fire('toggle_mode');

            break;

        // h, ?: show help
        case 104:
        case 63:
            ev.fire('show_help');

            break;

        // +, =: increase speed
        case 43:
        case 61:
            ev.fire('increase_speed');
            break;

        // -, _: decrease speed
        case 45:
        case 95:
            ev.fire('decrease_speed');
            break;
    }
}

// when user selects file
ktz.ui.handlers.onFileSelect = function (e) {
    var file = e.target.files[0]

    if (!file) {
        return;
    }

    if (file.type != 'text/plain') {
        alert('Kutuzov can\'t see anything except old plain text files.');
        return;
    }

    var reader = new FileReader();
    reader.onloadend = function(e) { ktz.ui.handlers.onFileLoad(e, reader) };
    reader.readAsText(file);
}

// when file load ends
ktz.ui.handlers.onFileLoad = function (e, reader) {
    ev.fire('file_load', reader);
}

// switch between modes (play, pause, select file etc)
ktz.ui.handlers.onToggleMode = function () {
    if (ktz.ui.controls.style.display == 'none') {
        ktz.ui.controls.style.display = 'block';
    } else {
        ktz.ui.controls.style.display = 'none';
    }
}

// handles persistent settings
function KtzConfig() {
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

    // checks if browser has localStorage support
    function supportsLocalStorage() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    }
}

// loops through loaded text and gets the next chunk
function KtzIterator(arr, initPos, chunkSize) {
    var that = this;

    this.pos = parseInt(initPos);
    this.arr = arr.slice(this.pos);
    this.chunkSize = parseInt(chunkSize);

    this.next = function() {
        that.pos = that.pos + that.chunkSize;
        return this.arr.splice(that.chunkSize, that.chunkSize).join(' ');
    }

    this.current = function () {
        return that.arr.slice(0, that.chunkSize).join(' ');
    }
}

// play loaded text file
function KtzPlayer(config) {
    var that = this;

    this.playing = false;
    this.interval = null;

    this.play = function () {
        that.playing = true;
        that.interval = setInterval(function () {
            var chunk = that.iterator.next();
            if (!chunk) {
                that.stop();
            }

            ev.fire('chunk', chunk);
        }, 60 / that.wpm * 1000);
    }

    this.stop = function () {
        that.playing = false;
        clearInterval(that.interval);
    }

    this.init_from_config = function (config) {
        that.wpm = config.get('wpm');
        that.pos = config.get('pos');
        that.chunkSize = config.get('chunkSize');
        that.text = config.get('text');
        if (that.text) {
            that.iterator = new KtzIterator(that.text.split(/\s+/),
                that.pos, that.chunkSize);
        } else {
            that.iterator = new KtzIterator([], 0, 0);
        }

        ev.fire('chunk', this.iterator.current());
    }

    this.init_from_config(config);

    ev.bind('settings_change', function (config) {
        that.init_from_config(config);
        if (that.playing) {
            that.stop();
            that.play();
        }
    });

    ev.bind('toggle_mode', function () {
        if (that.playing) {
            that.stop();
        } else {
            that.play();
        }
    });
}

function getElementById(id) {
    return document.getElementById(id);
}

function addEventListener(elem, ev, callback) {
    return elem.addEventListener(ev, callback, true);
}

function callback(context, fun) {
    return function() {
        return fun.apply(context, arguments);
    }
}

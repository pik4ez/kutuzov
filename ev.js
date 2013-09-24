ev = {}
ev.listeners = {}

ev.bind = function (name, callback) {
    ev.listeners[name] = ev.listeners[name] || [];
    ev.listeners[name].push(callback);
}

ev.fire = function(name, args) {
    var listeners = ev.listeners[name] || [];
    for (i in listeners) {
        listeners[i].call(null, args);
    }
}

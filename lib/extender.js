// Copyright (c) 2016, the M-Transform.js project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by a MIT-style license that can be found in the LICENSE file.
/*jslint node: true, nomen: true*/
"use strict";

var _ = require('lodash');

function createElementsLookup(elements) {
    return _.chain(elements)
        .map(function (e) { return [e.id, e]; })
        .fromPairs()
        .value();
}

function createRelationsLookup(relations) {
    return _.groupBy(relations, 'type');
}

function createIsTypeChecker(types) {
    return function (element, defaultValue) {
        element = this.toElement(element);
        if (!element) { return !!defaultValue; }
        return _.includes(types, element.type);
    };
}

function createGetRelatedElementsHelper(lookup) {
    return function (id, defaultValue) {
        if (arguments.length > 1 && !Array.isArray(defaultValue)) {
            defaultValue = [defaultValue];
        }
        return lookup[this.toId(id)] || defaultValue || [];
    };
}

function createGetRelatedIdElementHelper(lookup) {
    var getter = createGetRelatedElementsHelper(lookup);
    return function () {
        return _.head(getter.apply(this, arguments));
    };
}

function createGetRelatedElementHelper(lookup) {
    var getter = createGetRelatedIdElementHelper(lookup);
    return function () {
        return this.toElement(getter.apply(this, arguments));
    };
}

function Extender(model, options) {
    if (!(this instanceof Extender)) { return new Extender(model, options); }

    this.elements = model.elements.slice();
    this.relations = model.relations.slice();

    var self = this,
        element = createElementsLookup(self.elements),
        relation = createRelationsLookup(self.relations);

    self.toElement = function (id) {
        if (typeof id === 'object') { return id; }
        return element[id];
    };

    _.forEach(options.type, function (types, name) {
        if (!Array.isArray(types) && typeof types !== 'string') {
            throw new Error('a type must be a string or an array of strings');
        }
        if (Array.isArray(types)) {
            types = types.slice();
        } else {
            types = [types];
        }
        self['is' + name] = createIsTypeChecker(types);
    });

    _.forEach(options.relation, function (config, name) {
        var lookup = _.chain(relation[config.relation])
            .groupBy(config.from)
            .mapValues(function (rs) {
                return _.chain(rs)
                    .map(config.to)
                    .filter()
                    .value();
            })
            .value();
        if (config.single) {
            self['get' + name] = createGetRelatedElementHelper(lookup);
            self['get' + name + 'Id'] = createGetRelatedIdElementHelper(lookup);
        } else {
            self['get' + name] = createGetRelatedElementsHelper(lookup);
        }
    });

    _.forEach(options.custom, function (method, name) {
        self[name] = method;
    });
}

Extender.prototype.toId = function (element) {
    if (typeof element === 'string') { return element; }
    return element.id;
};

module.exports = Extender;

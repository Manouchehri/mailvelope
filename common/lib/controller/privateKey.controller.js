/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015  Thomas Oberndörfer
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

define(function(require, exports, module) {

  var sub = require('./sub.controller');
  var uiLog = require('../uiLog');

  function PrivateKeyController(port) {
    sub.SubController.call(this, port);
    this.done = null;
    this.keyring = require('../keyring');
    this.keyringId = null;
    this.options = null;
  }

  PrivateKeyController.prototype = Object.create(sub.SubController.prototype);

  PrivateKeyController.prototype.generateKey = function(password, options) {
    var that = this;
    if (options.length !== 2048 && options.length !== 4096) {
      this.ports.keyGenCont.postMessage({event: 'generate-done', error: {message: 'Invalid key length', code: 'KEY_LENGTH_INVALID'}});
      return;
    }
    this.keyring.getById(this.keyringId).generateKey({
      email: options.email,
      user: options.fullName,
      numBits: options.length,
      passphrase: password
    }, function(err, data) {
      that.ports.keyGenCont.postMessage({event: 'generate-done', publicKey: data.publicKeyArmored, error: err});
    });
  };

  PrivateKeyController.prototype.handlePortMessage = function(msg) {
    var that = this;
    switch (msg.event) {
      case 'keygen-user-input':
        uiLog.push(msg.source, msg.type);
        break;
      case 'open-security-settings':
        var hash = "#securitysettings";
        this.mvelo.tabs.loadOptionsTab(hash, function(old, tab) {
          if (old) {
            that.mvelo.tabs.sendMessage(tab, {
              event: "reload-options",
              hash: hash
            });
          }
        });
        break;
      case 'generate-key':
        this.keyringId = msg.keyringId;
        this.options = msg.options;
        this.ports.keyGenDialog.postMessage({event: 'check-dialog-inputs'});
        break;
      case 'input-check':
        if (msg.isValid) {
          this.generateKey(msg.pwd, this.options);
        } else {
          this.ports.keyGenCont.postMessage({event: 'generate-done', error: {message: 'The inputs "password" and "confirm" are not valid', code: 'INPUT_NOT_VALID'}});
        }
        break;
      case 'dialog-init':
        this.ports.keyGenCont.postMessage({event: 'dialog-done'});
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  exports.PrivateKeyController = PrivateKeyController;

});
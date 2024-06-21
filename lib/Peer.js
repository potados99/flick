const fetch = require('node-fetch');
const parser = require('ua-parser-js');
const {uniqueNamesGenerator, colors, animals} = require('unique-names-generator');

class Peer {
  constructor(socket, request) {
    // set socket
    this.socket = socket;

    // set remote ip
    this._setIP(request);

    // set peer id
    this._setPeerId(request)
    // is WebRTC supported ?
    this.rtcSupported = request.url.indexOf('webrtc') > -1;

    // A method call for setting name is moved inside to getReady()
    // because it  requires a network call.

    // for keepalive
    this.timerId = 0;
    this.lastBeat = Date.now();
  }

  // return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  static uuid() {
    let uuid = '',
      ii;
    for (ii = 0; ii < 32; ii += 1) {
      switch (ii) {
        case 8:
        case 20:
          uuid += '-';
          uuid += (Math.random() * 16 | 0).toString(16);
          break;
        case 12:
          uuid += '-';
          uuid += '4';
          break;
        case 16:
          uuid += '-';
          uuid += (Math.random() * 4 | 8).toString(16);
          break;
        default:
          uuid += (Math.random() * 16 | 0).toString(16);
      }
    }
    return uuid;
  };

  async getReady(request) {
    // set name
    await this._setName(request);

    return this;
  }

  _setIP(request) {
    if (request.headers['x-forwarded-for']) {
      this.ip = request.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
    } else {
      this.ip = request.connection.remoteAddress;
    }
    // IPv4 and IPv6 use different values to refer to localhost
    if (this.ip === '::1' || this.ip === '::ffff:127.0.0.1') {
      this.ip = '127.0.0.1';
    }
  }

  _setPeerId(request) {
    if (request.peerId) {
      this.id = request.peerId;
    } else {
      this.id = request.headers.cookie.replace('peerid=', '');
    }
  }

  toString() {
    return `<Peer id=${this.id} ip=${this.ip} rtcSupported=${this.rtcSupported}>`
  }

  async _setName(req) {
    let ua = parser(req.headers['user-agent']);

    let deviceName = '';
    let displayName = '';

    if (ua.os && ua.os.name) {
      deviceName = ua.os.name.replace('Mac OS', 'Mac') + ' ';
    }

    if (ua.device.model) {
      deviceName += ua.device.model;
    } else {
      deviceName += ua.browser.name;
    }

    if (!deviceName)
      deviceName = 'Unknown Device';

    displayName = uniqueNamesGenerator({
      length: 2,
      separator: ' ',
      dictionaries: [colors, animals],
      style: 'capital',
      seed: this.id.hashCode()
    })

    console.log(`Good. Got '${displayName}'.`);

    this.name = {
      model: ua.device.model,
      os: ua.os.name,
      browser: ua.browser.name,
      type: ua.device.type,
      deviceName,
      displayName
    };
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      rtcSupported: this.rtcSupported
    }
  }
}

module.exports = Peer;

const WebSocket = require('ws');
const Peer = require('./Peer.js');

class FlickServer {
  constructor(server) {
    this._wss = new WebSocket.Server({server});
    this._wss.on('connection', async (socket, request) => new Peer(socket, request).getReady(request).then((peer) => this._onConnection(peer)));
    this._wss.on('headers', (headers, response) => this._onHeaders(headers, response));
  }

  _onConnection(peer) {
    this._joinRoom(peer);
    peer.socket.on('message', message => this._onMessage(peer, message));
    this._keepAlive(peer);

    this._send(peer, {
      type: 'display-name',
      message: {
        displayName: peer.name.displayName,
        deviceName: peer.name.deviceName
      }
    });
  }

  _onHeaders(headers, response) {
    if (response.headers.cookie && response.headers.cookie.indexOf('peerid=') > -1) return;
    response.peerId = Peer.uuid();
    headers.push('Set-Cookie: peerid=' + response.peerId + '; SameSite=Strict; Secure');
  }

  _onMessage(sender, message) {
    try {
      message = JSON.parse(message);
    } catch (e) {
      console.error(`Malformed JSON message: ${e}`);
      return;
    }

    switch (message.type) {
      case 'disconnect':
        this._leaveRoom(sender);
        break;
      case 'pong':
        sender.lastBeat = Date.now();
        break;
    }

    // relay message to recipient
    if (message.to && this._rooms[sender.ip]) {
      const recipientId = message.to; // TODO: sanitize
      const recipient = this._rooms[sender.ip][recipientId];
      delete message.to;
      message.sender = sender.id;

      this._send(recipient, message);
    }
  }

  _joinRoom(peer) {
    // if room doesn't exist, create it
    if (!this._rooms[peer.ip]) {
      this._rooms[peer.ip] = {};
    }

    // notify all others
    for (const otherPeerId in this._rooms[peer.ip]) {
      const otherPeer = this._rooms[peer.ip][otherPeerId];

      this._send(otherPeer, {
        type: 'peer-joined',
        peer: peer.getInfo()
      });
    }

    // notify peer about the other peers
    const otherPeers = [];
    for (const otherPeerId in this._rooms[peer.ip]) {
      otherPeers.push(this._rooms[peer.ip][otherPeerId].getInfo());
    }

    this._send(peer, {
      type: 'peers',
      peers: otherPeers
    });

    // add peer to room
    this._rooms[peer.ip][peer.id] = peer;
  }

  _leaveRoom(peer) {
    if (!this._rooms[peer.ip] || !this._rooms[peer.ip][peer.id]) {
      return;
    }

    this._cancelKeepAlive(this._rooms[peer.ip][peer.id]);

    // delete the peer
    delete this._rooms[peer.ip][peer.id];

    peer.socket.terminate();

    //if room is empty, delete the room
    if (!Object.keys(this._rooms[peer.ip]).length) {
      delete this._rooms[peer.ip];
    } else {
      // notify all others
      for (const otherPeerId in this._rooms[peer.ip]) {
        const otherPeer = this._rooms[peer.ip][otherPeerId];

        this._send(otherPeer, {type: 'peer-left', peerId: peer.id});
      }
    }
  }

  _send(peer, message) {
    if (!peer) {
      return;
    }

    if (this._wss.readyState !== this._wss.OPEN) {
      return;
    }

    message = JSON.stringify(message);

    peer.socket.send(message, () => '');
  }

  _keepAlive(peer) {
    this._cancelKeepAlive(peer);
    const timeout = 30000;

    if (!peer.lastBeat) {
      peer.lastBeat = Date.now();
    }

    if (Date.now() - peer.lastBeat > 2 * timeout) {
      this._leaveRoom(peer);
      return;
    }

    this._send(peer, {type: 'ping'});

    peer.timerId = setTimeout(() => this._keepAlive(peer), timeout);
  }

  _cancelKeepAlive(peer) {
    if (peer && peer.timerId) {
      clearTimeout(peer.timerId);
    }
  }
}

module.exports = FlickServer;

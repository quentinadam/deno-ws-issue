class Connection {
  constructor(
    readonly socket: WebSocket,
    readonly remoteAddr: string,
  ) {}

  send(message: string) {
    this.socket.send(message);
  }
}

class Connections {
  readonly connections = new Set<Connection>();

  send(message: string, connection?: Connection) {
    if (connection === undefined) {
      for (const connection of this.connections) {
        this.send(message, connection);
      }
    } else {
      if (connection.socket.readyState === WebSocket.OPEN) {
        try {
          connection.send(message);
        } catch (error) {
          console.error(`error sending message to websocket from ${connection.remoteAddr}`, error);
        }
      } else {
        console.log(`websocket from ${connection.remoteAddr} readystate is ${connection.socket.readyState}`);
        this.connections.delete(connection);
      }
    }
  }

  add(connection: Connection) {
    connection.socket.onopen = () => {
      console.log(`websocket from ${connection.remoteAddr} is open`);
      this.connections.add(connection);
      connection.socket.onclose = () => {
        console.log(`websocket from ${connection.remoteAddr} is closed`);
        this.connections.delete(connection);
      };
    };
  }
}

const connections = new Connections();

setInterval(() => {
  const length = Deno.env.get('LENGTH') !== undefined ? parseInt(Deno.env.get('LENGTH')!) : 3500;
  const base = `This text is ${length} bytes long. `;
  const message = base.repeat(Math.ceil(length / base.length)).slice(0, length);
  connections.send(message);
}, 1000);

const port = Deno.env.get('PORT') !== undefined ? parseInt(Deno.env.get('PORT')!) : 8000;

Deno.serve({ port }, (request, { remoteAddr: { hostname, port } }) => {
  const url = new URL(request.url);
  const remoteAddr = `${hostname}:${port}`;
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  console.log(`${request.method} ${url.pathname + url.search} ${remoteAddr} ${userAgent}`);
  if (url.pathname === '/ws') {
    const { response, socket } = Deno.upgradeWebSocket(request);
    connections.add(new Connection(socket, remoteAddr));
    return response;
  } else {
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  }
});

const html = `
<!DOCTYPE html><html><head><title>Test Deno WS</title></head>
<body>
<div id="status"></div>
<script>
function log(message) {
  console.log(message);
  document.getElementById('status').innerHTML = message;
}
function connect() {
  log('Trying to connect...');
  const url = new URL('/ws', window.location.href);
  url.protocol = url.protocol.replace('http', 'ws');
  const socket = new WebSocket(url.toString());
  socket.addEventListener('open', function (event) {
    log('Connected!');
  });
  socket.addEventListener('message', function (event) {
    log('Message received at ' + new Date().toString() + ' : ' + event.data);
  });
  socket.addEventListener('close', function (event) {
    log('Disconnected!');
    setTimeout(connect, 1000);
  });
}
connect();
</script></body></html>`;

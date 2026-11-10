"""WhatIF local qualification adapter; not part of the upstream application."""
import hashlib
import json
import os
from pathlib import Path
import secrets
from datetime import timedelta
from wsgiref.simple_server import make_server, WSGIServer
from socketserver import ThreadingMixIn
from sqlalchemy.engine import URL

# Source execution uses the exact upstream factory. No monkey-patching or fixture routes.
from conduit.app import create_app
from conduit.settings import ProdConfig
from conduit.extensions import db

root = Path(__file__).resolve().parent
data = Path(os.environ['WHATIF_DATA_DIR']).resolve()
mode = os.environ['WHATIF_MODE']
assert mode in ('init', 'serve')
assert data.is_dir()
secret_path = data / 'session-secret.txt'
if mode == 'init':
    assert not (data / 'database.sqlite').exists(), 'Refusing to initialize an existing database'
    with secret_path.open('x') as secret_file:
        secret_file.write(secrets.token_hex(32))
    secret_path.chmod(0o600)

connection = json.loads(os.environ['WHATIF_POSTGRES_CONNECTION'])
class QualificationConfig(ProdConfig):
    SQLALCHEMY_DATABASE_URI = URL.create('postgresql+psycopg2', username=connection['user'], password=connection.get('password'), database=connection['database'], query={'host': connection['host'], 'port': str(connection['port'])})
    SECRET_KEY = secret_path.read_text()
    DEBUG = False
    TESTING = False
    PROPAGATE_EXCEPTIONS = False
    BCRYPT_LOG_ROUNDS = 4  # Explicit disposable-fixture speed setting; not production guidance.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)

app = create_app(QualificationConfig)
if mode == 'init':
    with app.app_context():
        db.create_all()
else:
    port = int(os.environ['WHATIF_PORT'])
    assert 0 < port < 65536
    files = json.loads(os.environ['WHATIF_SOURCE_FILES'])
    assert isinstance(files, list) and files
    snapshot = []
    for name in files:
        assert isinstance(name, str) and name and not Path(name).is_absolute()
        file = (root / name).resolve()
        assert root in file.parents and file.is_file()
        snapshot.append({'path': name, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    source_hash = hashlib.sha256((json.dumps(snapshot, indent=2) + '\n').encode()).hexdigest()
    class ThreadedServer(ThreadingMixIn, WSGIServer):
        daemon_threads = True
    with make_server('127.0.0.1', port, app, server_class=ThreadedServer) as server:
        print(json.dumps({'whatifReady': True, 'pid': os.getpid(), 'port': port, 'sourceSha256': source_hash}), flush=True)
        server.serve_forever()

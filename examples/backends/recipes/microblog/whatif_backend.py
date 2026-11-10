"""Trusted WhatIF bootstrap; upstream application modules remain unchanged."""
import hashlib
import json
import os
from pathlib import Path
from wsgiref.simple_server import make_server, WSGIRequestHandler
from api.app import create_app, db
from config import Config

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ['WHATIF_DATA_DIR']).resolve()

class LocalConfig(Config):
    DEBUG = False
    TESTING = False
    DISABLE_AUTH = False
    USE_CORS = False
    OAUTH2_PROVIDERS = {}
    MAIL_SUPPRESS_SEND = True
    SECRET_KEY = 'whatif-owned-disposable-synthetic-secret'
    REFRESH_TOKEN_IN_BODY = True
    REFRESH_TOKEN_IN_COOKIE = False
    ALCHEMICAL_DATABASE_URL = 'sqlite:///' + str(DATA / 'database.sqlite')

app = create_app(LocalConfig)
mode = os.environ.get('WHATIF_MODE', os.environ.get('MODE', 'serve'))
if mode == 'init':
    with app.app_context():
        db.create_all()
        db.session.close()
elif mode == 'serve':
    class QuietHandler(WSGIRequestHandler):
        def log_message(self, format, *args):
            pass
    port = int(os.environ['WHATIF_PORT'])
    server = make_server('127.0.0.1', port, app, handler_class=QuietHandler)
    files = json.loads(os.environ['WHATIF_SOURCE_FILES'])
    identity = [{'path': name, 'sha256': hashlib.sha256((ROOT / name).read_bytes()).hexdigest()} for name in files]
    digest = hashlib.sha256((json.dumps(identity, indent=2) + '\n').encode()).hexdigest()
    print(json.dumps({'whatifReady': True, 'pid': os.getpid(), 'port': server.server_port, 'sourceSha256': digest}), flush=True)
    server.serve_forever()
else:
    raise ValueError('Unsupported WhatIF mode')

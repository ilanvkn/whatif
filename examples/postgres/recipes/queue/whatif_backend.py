"""Trusted HTTP/worker adapter. Reliability is a requested extension of the upstream sum demo."""
import hashlib
import json
import os
from pathlib import Path
from wsgiref.simple_server import make_server, WSGIRequestHandler
import psycopg
from demo.app import app, connection_kwargs
from demo.tasks import sum as sum_task

ROOT = Path(__file__).resolve().parent
MODE = os.environ['WHATIF_MODE']
TOKEN = 'Bearer whatif-synthetic-owner'

def connect():
    return psycopg.connect(**connection_kwargs)

def source_hash():
    entries=[]
    for name in json.loads(os.environ['WHATIF_SOURCE_FILES']):
        file=(ROOT/name).resolve()
        assert ROOT in file.parents and file.is_file()
        entries.append({'path': name, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    return hashlib.sha256((json.dumps(entries,indent=2)+'\n').encode()).hexdigest()

def fail_once_after_completion(call_next, context, worker):
    result=call_next()
    with connect() as conn:
        first=conn.execute('INSERT INTO whatif_delivery_faults(job_id) VALUES (%s) ON CONFLICT DO NOTHING RETURNING job_id', (context.job.id,)).fetchone()
    if first:
        raise RuntimeError('Owned synthetic lost acknowledgment after task execution')
    return result

def respond(start_response,status,value):
    payload=json.dumps(value).encode()
    start_response(status,[('Content-Type','application/json'),('Content-Length',str(len(payload))),('Cache-Control','no-store')])
    return [payload]

def http_app(environ,start_response):
    if environ.get('HTTP_AUTHORIZATION') != TOKEN:
        return respond(start_response,'401 Unauthorized',{'error':'Authentication required'})
    route=environ.get('PATH_INFO');method=environ.get('REQUEST_METHOD')
    if route=='/jobs' and method=='POST':
        try:
            size=int(environ.get('CONTENT_LENGTH') or '0')
            if not 0<size<=1024:raise ValueError()
            value=json.loads(environ['wsgi.input'].read(size));a=value['a'];b=value['b']
            if type(a) is not int or type(b) is not int or abs(a)>1000 or abs(b)>1000:raise ValueError()
            job_id=sum_task.defer(a=a,b=b)
        except (ValueError,KeyError,TypeError):
            return respond(start_response,'400 Bad Request',{'error':'Two bounded integers required'})
        return respond(start_response,'202 Accepted',{'jobId':job_id})
    if route=='/state' and method=='GET':
        with connect() as conn:
            row=conn.execute("SELECT count(*),count(*) FILTER (WHERE status='succeeded'),count(*) FILTER (WHERE status='failed'),coalesce(sum(attempts),0) FROM procrastinate_jobs").fetchone()
            effect=conn.execute('SELECT count(*),min(result) FROM whatif_effects').fetchone()
            faults=conn.execute('SELECT count(*) FROM whatif_delivery_faults').fetchone()[0]
        return respond(start_response,'202 Accepted' if row[1]+row[2]<row[0] else '200 OK',dict(total=row[0],succeeded=row[1],failed=row[2],attempts=row[3],effectCount=effect[0],result=effect[1],faults=faults))
    return respond(start_response,'404 Not Found',{'error':'Not found'})

if MODE=='init':
    with app.open():
        app.schema_manager.apply_schema()
    with connect() as conn:
        conn.execute('CREATE TABLE whatif_effects (work_key TEXT PRIMARY KEY, result BIGINT NOT NULL)')
        conn.execute('CREATE TABLE whatif_delivery_faults (job_id BIGINT PRIMARY KEY)')
elif MODE=='worker':
    with app.open():
        print(json.dumps({'whatifWorkerReady':True,'pid':os.getpid(),'sourceSha256':source_hash()}),flush=True)
        app.run_worker(queues=['sums'],concurrency=1,fetch_job_polling_interval=0.1,task_middleware=[fail_once_after_completion])
elif MODE=='serve':
    class Quiet(WSGIRequestHandler):
        def log_message(self,*args):pass
    with app.open():
        with make_server('127.0.0.1',int(os.environ['WHATIF_PORT']),http_app,handler_class=Quiet) as server:
            print(json.dumps({'whatifReady':True,'pid':os.getpid(),'port':server.server_port,'sourceSha256':source_hash()}),flush=True)
            server.serve_forever()
else:
    raise ValueError('Unsupported mode')

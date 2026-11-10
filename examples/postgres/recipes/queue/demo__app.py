"""Immutable local connection configuration for the upstream task demonstration."""
import json
import os
import procrastinate

connection = json.loads(os.environ['WHATIF_POSTGRES_CONNECTION'])
connection_kwargs = {'host': connection['host'], 'port': connection['port'],
                     'dbname': connection['database'], 'user': connection['user']}
if connection.get('password'):
    connection_kwargs['password'] = connection['password']
app = procrastinate.App(connector=procrastinate.PsycopgConnector(kwargs=connection_kwargs),
                        import_paths=['demo.tasks'])

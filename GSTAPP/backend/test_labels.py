import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv('../.env')
URI = os.getenv('NEO4J_URI')
USER = os.getenv('NEO4J_USERNAME')
PASS = os.getenv('NEO4J_PASSWORD')
DB = os.getenv('NEO4J_DATABASE')

driver = GraphDatabase.driver(URI, auth=(USER, PASS))
with driver.session(database=DB) as session:
    res = session.run('CALL db.labels() YIELD label RETURN label')
    print('Labels:', [r['label'] for r in res])
    
    # Check what labels exist in the first 10 nodes
    res = session.run('MATCH (n) RETURN labels(n) as l limit 10')
    print('Sample Labels:', [r['l'] for r in res])

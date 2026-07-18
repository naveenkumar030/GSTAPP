import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://cb1ca217.databases.neo4j.io")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "cb1ca217")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "YTdQZ9KwEh3QkZC4sMXod4m4QkKiWgFnL0_2gT9lV_4")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "cb1ca217")

print("URI:", NEO4J_URI)
print("USERNAME:", NEO4J_USERNAME)
print("DATABASE:", NEO4J_DATABASE)

try:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
    driver.verify_connectivity()
    print("Connection successful!")
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run("MATCH (n) RETURN count(n) as count")
        for record in result:
            print(f"Total nodes in database: {record['count']}")
    driver.close()
except Exception as e:
    print(f"Connection failed: {e}")

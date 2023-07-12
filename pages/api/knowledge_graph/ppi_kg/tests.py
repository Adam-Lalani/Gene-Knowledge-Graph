import requests


payload = {'geneset' : ["ADA", 'STAT3'], 'subgraph_size': 10, "databases" : ["bioGRID", 'iid']} 

res = requests.post("http://localhost:3000/G2Ntest/api/knowledge_graph/ppi_kg", json = payload)

print(res, res.text)
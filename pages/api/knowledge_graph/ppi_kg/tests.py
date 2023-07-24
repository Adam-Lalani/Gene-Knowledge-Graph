import requests


payload = {'geneset' : ["ADA", 'STAT3']} 

res = requests.post("http://localhost:3000/G2NKG/api/knowledge_graph/ppi_kg", json = payload)

print(res.text)
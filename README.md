# Introduction

[Genes4Networks](https://g2nkg.dev.maayanlab.cloud/) (G4N) was built to serve as a tool for biologists to study and visualize the relationship between genes and proteins produced through genomic and proteomic studies and to highlight additional genes and proteins which may play important roles in biological systems.

This documentation describes the API for G4N. This API is for developers who want to programmatically perform data analysis. 

In this documentation, we will use Python to demo the API requests. The code can be used as is or as a template for your own modifications in Python or another language. We use the requests library, which can be installed with pip.

## Build Instructions 
The project can be deployed locally if a neo4j database is available with:
```
npm run dev
# or
yarn dev
```

This project was deployed using docker. 
```
docker-compose build kg 

docker-compose push kg
```

## Generate Geneset Subgraph 

| Method | URL | Input | Returns |
| :--- | :--- | :--- | :--- | 
| `POST` | `https://g2nkg.dev.maayanlab.cloud/api/knowledge_graph/ppi_kg` | A python `dict` containing a `list` of seed genes as type `string` mapped to `geneset:` | A JSON object storing protein nodes and edges

**Example:**
```python
import requests 

G4N_URL = 'https://g2nkg.dev.maayanlab.cloud/api/knowledge_graph/ppi_kg'

query = {'geneset' : ['NDUFB6','ERGIC3']}

results = requests.post(G4N_URL, json = query)

results = results.json()
``` 
**Results:**

```python
# Separate results into nodes and edges 
nodes = {}
edges = []
for i in results:
    if i["data"]["kind"] == 'Relation':
        edges.append(i['data'])
    else:
        nodes[i["data"]["id"]] = i["data"]
```

**Additional Parameters**

| Parameter | Description | Default Value | Example
| :--- | :--- | :--- | :--- |
| `path_length` | The maximum length between two seed genes. Can be an `int` between 0-2. | `2` | `{'geneset' : ['NDUFB6','ERGIC3'], 'path_length':1}`
|`subgraph_size`| The maximum number of nodes in the output. Can be any `int` between `0-200`.| `20`|  `{'geneset' : ['NDUFB6','ERGIC3'], 'subgraph_size':1}`
|`biogrid`| Include data from the BioGRID Database.| `True` | `{'geneset' : ['NDUFB6','ERGIC3'], 'biogrid': False}`
|`bioplex`| Include data from the BioPlex 3.0 Database.| `True` | `{'geneset' : ['NDUFB6','ERGIC3'], 'bioplex': False}`
|`iid`| Include data from the Integrated Interactions Database.| `True` | `{'geneset' : ['NDUFB6','ERGIC3'], 'iid': False}`
|`string`| Include data from the String Database.| `True` | `{'geneset' : ['NDUFB6','ERGIC3'], 'string': False}`
|`ht`| Include PPIs found through high-throughput methods. Parameter is only active if `'biogrid' = True`, otherwise it is ignored.| `True` | `{'geneset' : ['NDUFB6','ERGIC3'], 'biogrid': True, 'ht' : False}`
|`ci`| Filter PPIs based on confidence a given interaction is real. Can be a `float` such that `0≤n<1`. Parameter is only active if `'bioplex' = True`, otherwise it is ignored.| `0` | `{'geneset' : ['NDUFB6','ERGIC3'], 'bioplex': True, 'ci' : 0.85}`
|`pred`| Include PPIs found through machine-learning prediction methods. Parameter is only active if `'iid' = True`, otherwise it is ignored.| `True` | `{'geneset' : ['NDUFB6','ERGIC3'], 'iid': True, 'pred' : False}`
|`ortho`| Include orthologous PPIs. Parameter is only active if `'iid' = True`, otherwise it is ignored.| `True` | `{'geneset' : ['NDUFB6','ERGIC3'], 'iid': True, 'ortho' : False}`
|`c1`| Change the color of the seed nodes. Can be any `string` representing a hex color code. Only relevant is data is being graphed.|`#aff0ca` | `{'geneset' : ['NDUFB6','ERGIC3'], 'c1' : "#aff0ca" }`
|`c2`| Change the color of the non-seed nodes. Can be any `string` representing a hex color code. Only relevant is data is being graphed.|`#ade7ff` | `{'geneset' : ['NDUFB6','ERGIC3'], 'c2' : "#ade7ff" }`

import fetch from "node-fetch";
import neo4j from "neo4j-driver"
import { neo4jDriver } from "../../../../utils/neo4j"

export const node_colour = ({label, input_list}) => {
    if (input_list.includes(label)){
        return "#3b609c"
    } 
    return "#ADD8E6"
}



export const resolve_results = ({results, input_list}) => {
    try{
		const res = results.records.flatMap(record => {
			const relations = record.get('r')
			const nodes = record.get('n').reduce((acc, i)=>({
				...acc,
				[i.identity]: i
			}), {})
			const path = []
			if (relations.length > 0) {
				for (const relation of relations) {
					const start_node = nodes[relation.start]
					const end_node = nodes[relation.end]
					const relation_type = relation.type
					const start_type = start_node.labels.filter(i=>i!=="id")[0]
					const end_type = end_node.labels.filter(i=>i!=="id")[0]
					const start_kind = start_type
					const end_kind = end_type
					path.push({ 
						data: {
							id: start_node.properties.id,
							kind: start_kind,
							label: start_node.properties.label || start_node.properties.id,
                            // add coloring scheme 

							color: node_colour({label: start_node.properties.label, input_list: input_list})
						} 
					})
					path.push({ 
						data: {
							source: start_node.properties.id,
							target: end_node.properties.id,
							kind: "Relation",
							relation: relation_type,
							label: relation_type,
                            Source_Database: relation.properties['source_database'] || "",
							properties: {
                                Experimental_System: relation.properties['experimental_system'] || "",
                                Evidence_Type: relation.properties['evidence_type'] || "",
                                Throughput: relation.properties['Throughput'] || "",
                                pmids: relation.properties['pmids'] || "",
                                Interaction_Confidence_bioplex: relation.properties['interaction_confidence'] || "",
                                Combined_Score_stringDB : relation.properties['combined_score'] || "",
                                
                            },

							lineColor: "#b3b3b3",
							directed: 'none'
						} 
					})
					path.push({ 
						data: {
							id: end_node.properties.id,
							kind: end_kind,
							label: end_node.properties.label || end_node.properties.id,
							color: node_colour({label: end_node.properties.label, input_list: input_list})
						} 
					})
				}
			} 
			return path
		  })
		return res
	} catch(error){
       return error.message
    }
}



const subgraph = async ({session, geneset, path_length, subgraph_size, databases}) => {

    try {
        let q  = `MATCH p=(a:Protein WHERE a.label IN ${JSON.stringify(geneset)})-[r:PPI *0..${path_length}]-(b:Protein WHERE b.label IN ${JSON.stringify(geneset)})
        WHERE ALL(rel in r where rel.source_database =~ ${JSON.stringify(databases)})
        RETURN p, nodes(p) as n, r
        LIMIT ${subgraph_size}`
        
        // `MATCH p=(a:Protein)-[r:PPI *0..${path_length}]-(b:Protein)
        // WHERE a.label IN ${JSON.stringify(geneset)} AND b.label IN ${JSON.stringify(geneset)}
        // RETURN p, nodes(p) as n, r
        // LIMIT ${subgraph_size}`
        

        
        // `MATCH (n:Protein) where n.label IN ${JSON.stringify(geneset)} \
        //  WITH collect(n) as \
        //  nodes UNWIND nodes as n \
        //  UNWIND nodes as m \
        //  WITH * WHERE id(n) < id(m) \
        //  MATCH path = allShortestPaths( (n)-[*..${path_length}]-(m) ) \
        //  RETURN path`

        const subg = await session.run(q)

        

        const end = resolve_results({results: subg, input_list: geneset})
        return end

    } catch (error) {
        console.log(error)
        res.status(500).send({message: error.message})
    }
}


export default async function query(req, res) {
    try {
        console.log(req.method)
        if (req.method !== 'POST') {
            res.status(405).send({ message: 'Only POST requests allowed' })
            return
        } else {
            try {
                const ret = req.body

                //JSON.parse(req.body)
                // define input params 
                //check if gene list is here
                if (ret.geneset === undefined) {
                    res.status(900).send("geneset is undefined")
                }
                // check it is a list of stirngs
                if (!(Array.isArray(ret.geneset))) {
                    res.status(400).send("invalid input format, geneset is not an array")
                }
                let x; 
                for (x in ret.geneset) {
                    if (typeof ret.geneset[x] !== 'string'){
                        res.status(400).send("invalid input format at location " + num.toString(x) + " in geneset")
                    }
                }


                //format databases 
                if (ret.databases === undefined){
                    ret.databases = ['iid*.|bioGRID|STRING|bioPlex 3.0']
                }

                // check if its an array
                if (!(Array.isArray(ret.databases))) {
                    res.status(400).send("Database format is not a list")
                }

                // make every one into a regex string
                let y
                let temp = ''
                for (y in ret.databases) {
                    if (typeof ret.databases[y] !== 'string'){
                        res.status(400).send("invalid input format")
                    } else{
                        temp = temp + '.*' + ret.databases[y] + '*.|'
                    }
                }
                ret.databases = [temp]


                // assign other fields 
                if (ret.path_length === undefined | isNaN(ret.path_length) | ret.path_length > 2){
                    ret.path_length = 2
                }

                if (ret.subgraph_size === undefined | isNaN(ret.subgraph_size) | ret.subgraph_size > 200){
                    ret.subgraph_size = 20
                }

                // connect to neo4j
                const session = neo4jDriver.session({
                    defaultAccessMode: neo4j.session.READ
                })

                // call subgraph function
                const geneset = ret.geneset
                const path_length = ret.path_length
                const subgraph_size  = ret.subgraph_size
                const databases = ret.databases[0]

                const results =  await subgraph({session, geneset, path_length, subgraph_size, databases})

                res.status(200).send(JSON.stringify(results))
                
        

                session.close();

            } catch (error) {
                console.log(error)
                res.status(300).send({message: error.message})
            }     
        }

    } catch (error) {
        res.status(500).send(error)
    }

}
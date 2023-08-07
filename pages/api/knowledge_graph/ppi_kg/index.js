import fetch from "node-fetch";
import neo4j from "neo4j-driver"
import { neo4jDriver } from "../../../../utils/neo4j"

let keyCol = "#aff0ca"


let regCol = '#ade7ff'

export const node_colour = ({label, id, input_list}) => {
    if (input_list.includes(label) || input_list.includes(id)){
        return keyCol
        //"#aff0ca"
         //"#3f51b5"
    } 
    // #ADD8E6"
    return regCol
    //'#ade7ff'
    // "#a7d5f2"
    //"#3b609c"
    
}


export const computeZ = async ({inputs}) => {
    let d = 30000
    let c = 0

    // compute number of edges on total subgraph
    for (const vals of inputs){
        if (vals['data']['kind'] === 'Relation'){
            c += 1
        }
    }


   // check if it is not a seed    
    for (const dt of inputs){
        if (dt["data"]["kind"] === 'Protein'){
             // if not seed compute pval and add to object
            if (!dt.data.seed){
                // a is degree
                const a = dt.data.degree
                // b is total_degree
                const b = dt.data.total_degree
                //compute pval
                const aoverc = (a/parseFloat(c))
                const boverd = (b/parseFloat(d))
                const top = aoverc - boverd
                const bottom = Math.sqrt((boverd * (1-boverd))/parseFloat(d))
                const zscore = top/bottom
                dt["data"]["zscore"] = zscore
               
            }
      

        }     
    }
   return inputs

}



export const resolve_results = ({results, input_list}) => {
    try{
        
        const degreeMap = new Map()
		const res = results.records.flatMap(record => {
			const relations = record.get('r')
			const nodes = record.get('n').reduce((acc, i)=>({
				...acc,
				[i.identity]: i
			}), {})
			const path = []
			if (relations.length > 0) {
                for (const relation of relations){
                    const start_node = nodes[relation.start].properties.id
                    const end_node = nodes[relation.end].properties.id
               
                    if (degreeMap[start_node]) {
                        degreeMap[start_node] += 1;
                    } else {
                        degreeMap[start_node] = 1;
                    }

                    if (degreeMap[end_node]) {
                        degreeMap[end_node] += 1;
                    } else {
                        degreeMap[end_node] = 1;
                    }
                    
                    


                }
                // add degrees in 
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
                            degree: degreeMap[start_node.properties.id],
                            color: node_colour({label: start_node.properties.label, id: start_node.properties.id, input_list: input_list}),
                            seed: (input_list.includes(start_node.properties.label) || input_list.includes(start_node.properties.id)),
                            total_degree: start_node.properties.degree['low'],
                            zscore: 0.0,
                            properties: {
                                id: start_node.properties.id,
							    kind: start_kind,
							    label: start_node.properties.label || start_node.properties.id,
                                degree: degreeMap[start_node.properties.id],
                            }
						} 
					})
					path.push({ 
						data: {
							source: start_node.properties.id, 
							target: end_node.properties.id, 
							kind: "Relation",
							relation: relation_type,
							label: relation_type,
                            source_database: relation.properties['source_database'] || "",
							properties: {
                                id: `${start_node.properties.label}_${relation_type}_${end_node.properties.label}`,
                                source_label: start_node.properties.label,
							    target_label: end_node.properties.label,
							    kind: "Relation",
							    relation: relation_type,
							    label: relation_type,
                                source_database: relation.properties['source_database'] || "",
                                experimental_system: relation.properties['experimental_system'] || "",
                                evidence_type: relation.properties['evidence_type'] || "",
                                throughput: relation.properties['Throughput'] || "",
                                pmids: relation.properties['pmids'] || "",
                                interaction_confidence: relation.properties['interaction_confidence'] || "",
                                combined_score : relation.properties['combined_score'] || "",
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
                            degree: degreeMap[end_node.properties.id],
							color: node_colour({label: end_node.properties.label, id: end_node.properties.id, input_list: input_list}),
                            seed: (input_list.includes(end_node.properties.label) || input_list.includes(end_node.properties.id)),
                            total_degree: end_node.properties.degree['low'],
                            zscore: 0.0,
                            properties: {
                                id: end_node.properties.id,
							    kind: start_kind,
							    label: end_node.properties.label || end_node.properties.id,
                                degree: degreeMap[end_node.properties.id],
                            }
						} 
					})
				}
			} 
			return path
		  })
          
		return computeZ({inputs: res})
        //return res
	} catch(error){
       return error.message
    }
}



const subgraph = async ({session, geneset, path_length, subgraph_size, biogrid, bioplex, iid, string, ci, ht, pred, ortho}) => {

    try {
        let q  = `MATCH p=(a:Protein WHERE a.label IN ${JSON.stringify(geneset)} or a.id in ${JSON.stringify(geneset)})
        -[r:PPI *0..${path_length}]
        -(b:Protein WHERE b.label IN ${JSON.stringify(geneset)} or b.id in ${JSON.stringify(geneset)})`
        
        let startfilt = ` WHERE ALL(rel in r where `
        let filt = []
        
        let rtrn = ` RETURN p, nodes(p) as n, r LIMIT ${subgraph_size}`


        let db = `(?i)`
        if (biogrid){
            db = db + `.*bioGRID.*|`
        }

        if (bioplex){
            db = db + `.*bioPlex*|`
        }

        if (iid){
            db = db+'.*iid.*|'
        }

        if (string){
            db = db+'.*STRING.*|'
        }

        
        if (db.length < 40){
            filt.push(`(rel.source_database =~` + ` "`+db+`"`+`)`)
         }


        if (ci !== 0 && bioplex){
            filt.push(`(rel.interaction_confidence> ${ci} or rel.interaction_confidence is Null)`)
        }

        // if ht is true we want to keep it, so when it is not true we want to filter out high
        if (!ht && biogrid){
            filt.push(`(rel.Throughput is Null or rel.Throughput=~ ".*Low.*")`)
        }

        // (rel.evidence_type =~ ".*exp.*|.*pred.*|.*ortho.*" or rel.evidence_type is Null)
        let orthopred = `.*exp.*|`
        if (pred){
            orthopred = orthopred + `.*pred.*|`
        }

        if (ortho){
            orthopred = orthopred + `.*ortho.*`
        }

        if (orthopred.length < 23 && iid){
            filt.push(`(rel.evidence_type =~` + ` "`+orthopred+`"`+` `+ `or rel.evidence_type is Null)`)
        }



        if (filt.length === 0) {
            startfilt = ``
        } else {
            filt = filt.join(' and ')
            filt = filt + `)`
            startfilt = startfilt + filt
        }

        console.log(JSON.stringify(q+startfilt+rtrn))
        const subg = await session.run(q+startfilt+rtrn)
        const end = resolve_results({results: subg, input_list: geneset})
        return end
        //return q+startfilt+rtrn

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

                // JSON.parse(req.body)
                // define input params 
                // check if gene list is here
                if (ret.geneset === undefined) {
                    throw new Error("geneset is undefined")
                }
                // check it is a list of stirngs
                if (!(Array.isArray(ret.geneset))) {
                    throw new Error("invalid input format, geneset is not an array")
                }
                let x; 
                for (x in ret.geneset) {
                    if (typeof ret.geneset[x] !== 'string'){
                        throw new Error("invalid input format at location " + num.toString(x) + " in geneset")
                    }
                }

                // format througput
                if (ret.ht === undefined){
                    ret.ht = true
                }
                
                if (typeof ret.ht !== 'boolean'){
                        throw new Error("invalid input for ht- make sure it is in form 'ht' :' true' or 'ht' : 'false' ")
                } 


                // filtering for predicted and orthologous want to keep by default 
                if (ret.pred === undefined){
                    ret.pred = true
                }

                if (typeof ret.pred !== 'boolean'){
                        throw new Error("invalid input for pred- make sure it is in form 'pred' : True or 'pred' : False")
                } 

                if (ret.ortho === undefined){
                    ret.ortho = true
                }

                if (typeof ret.ortho !== 'boolean'){
                        throw new Error("invalid input for ortho- make sure it is in form 'ortho' : True or 'pred' : False")
                } 

                // ci filtering 
                if (ret.ci === undefined) {
                    ret.ci = 0
                }

                if (typeof ret.ci !== 'number'){
                    throw new Error("invalid input for ci -  make sure it is a number between 0-1")
                }

                if (ret.ci > 1){
                    ret.ci = 0
                } 

                if (ret.c1 < 0){
                    ret.ci = 0
                }
                
                
                // biogrid bools
                if (ret.biogrid === undefined){
                    ret.biogrid = true
                }

                if (typeof ret.biogrid !== 'boolean'){
                        throw new Error("invalid input for biogrid- make sure it is in form 'biogrid' : True or 'biogrid' : False")
                } 

                // bioplex bools
                if (ret.bioplex === undefined){
                    ret.bioplex = true
                }

                if (typeof ret.bioplex !== 'boolean'){
                        throw new Error("invalid input for bioplex- make sure it is in form 'bioplex' : True or 'bioplex' : False")
                } 

                // iid bools 
                if (ret.iid === undefined){
                    ret.iid = true
                }

                if (typeof ret.iid !== 'boolean'){
                        throw new Error("invalid input for iid- make sure it is in form 'iid' : True or 'iid' : False")
                } 
                
                // string bools 
                if (ret.string === undefined){
                    ret.string = true
                }

                if (typeof ret.string !== 'boolean'){
                        throw new Error("invalid input for iid- make sure it is in form 'string' : True or 'string' : False")
                } 

                if (!ret.biogrid && !ret.bioplex && !ret.iid && !ret.string){
                    throw new Error('Please mark at least one database True')
                }

                const colorTest = /^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;

                if (colorTest.test(ret.c1)){
                    keyCol = ret.c1
                }

                if (colorTest.test(ret.c2)){
                    regCol = ret.c2
                }


                // assign other fields 
                if (ret.path_length === undefined || isNaN(ret.path_length) || ret.path_length > 2){
                    ret.path_length = 2
                }

                if (ret.subgraph_size === undefined || isNaN(ret.subgraph_size) || ret.subgraph_size > 200){
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
                //const databases = ret.databases[0]
                const ht = ret.ht
                const ci = ret.ci
                const pred = ret.pred
                const ortho = ret.ortho
                const biogrid = ret.biogrid 
                const bioplex = ret.bioplex
                const iid = ret.iid 
                const string = ret.string


                const results =  await subgraph({session, geneset, path_length, subgraph_size, biogrid, bioplex, iid, string, ci, ht, pred, ortho})
                
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
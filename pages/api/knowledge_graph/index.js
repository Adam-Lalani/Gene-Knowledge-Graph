import neo4j from "neo4j-driver"
import { neo4jDriver } from "../../../utils/neo4j"
import Color from 'color'
import { toNumber } from "../../../utils/helper"
import fetch from "node-fetch"
import {default_color, mui_colors} from '../../../utils/colors'
import { augment_gene_set, kind_mapper, get_node_color_and_type } from "./enrichment/augment"
let color_map = {}
let score_fields
const get_color = ({color, darken}) => {
	if (!color_map[color]) color_map[color] = Color(color)

	if (darken) return color_map[color].darken((darken)*0.65).hex()
	else return color_map[color].hex()
}

const highlight_color = '#aff0ca'

export const default_get_node_color_and_type = ({node, terms, color=default_color, aggr_scores, field, aggr_field, aggr_type, fields}) => {
	// if(terms.indexOf(node.properties.label) > -1){
	if (fields.filter(i=>i && terms.indexOf(node.properties[i]) > -1).length > 0) {
		return {color: highlight_color, node_type: 1}
	} else if (node.properties[field] && aggr_field!==undefined && aggr_type!==undefined) {
		const max = aggr_scores[`max_${field}`] || 0
		const min = aggr_scores[`min_${field}`] || 0
		const score = node.properties[field]
		// it's not neg to pos
		if ((min >= 0 && max >= 0) || (min < 0 && max <= 0)) {
			const ext_diff = Math.abs(max-min)
			const comp = aggr_type === "max" ? max: min
			const val_diff = Math.abs(score-comp)
			return {
				color: get_color({color, darken: 1-(val_diff/ext_diff)}),
				node_type: 0
			}
		} else {
			// two sided
			const comp = score > 0 ? max: min
			const val_diff = Math.abs(score-comp)
			const ext_diff = Math.abs(comp)
			return {
				color: get_color({color, darken: 1-(val_diff/ext_diff)}),
				node_type: 0
			}
		}
	}
	return {
		color:'#ade7ff', //get_color({color}),
		node_type: 0
	}		
}

const process_properties = (properties) => {
	const props = {}
	for ( const[k,v] of Object.entries(properties)) {
		if (typeof v === "object") {
			props[k] = toNumber(v)
		} else {
			props[k] = v
		}
	}
	return props
}

export const default_get_edge_color = ({relation, color, aggr_field, field, aggr_scores}) => {
	if (relation.properties[field] && aggr_field) {
		const aggr_score = aggr_scores[aggr_field]
		return {
			lineColor: get_color({color, darken: Math.abs(relation.properties[field]/aggr_score)}),
			node_type: 0
		}
	}
	return {
		lineColor: color
	}
}


export const resolve_results = ({results,
	terms,
	field,
	colors,
	start_field,
	end_field,
	aggr_scores,
	get_node_color_and_type=default_get_node_color_and_type,
	get_edge_color=default_get_edge_color,
	properties = {},
	kind_properties = {},
	misc_props = {},
	kind_mapper = null, 
}) => {
		const color_values = {}
		let color_index = 0
		let shade_index = 0
		const shade = ["A100", 200, "A700", "400", "A400"]
		const colors_func = (type) => {
			if (colors[type] && colors[type].color) {
				color_values[type] = colors[type]
			}else if (color_values[type] === undefined) {
				const c = Object.values(mui_colors)[color_index][shade[shade_index]]
				if (color_index < Object.keys(mui_colors).length) color_index = color_index + 1
				else {
					color_index = 0
					if (shade_index === shade.length) {
						shade_index = 0
					} else {
						shade_index = shade_index + 1
					}
				}
				color_values[type] = {color: c}
			}
			return {...color_values[type]}
		}
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
					const start_kind = kind_mapper ? kind_mapper({node: start_node, type: start_type, ...misc_props})  : start_type
					const end_kind = kind_mapper ? kind_mapper({node: end_node, type: end_type, ...misc_props})  : end_type
					path.push({ 
						data: {
							id: start_node.properties.id,
							kind: start_kind,
							label: start_node.properties.label || start_node.properties.id,
							properties: {
								...process_properties(start_node.properties),
								...properties[start_node.properties.label || start_node.properties.id] || {},
								...(kind_properties[start_kind] || {})[start_node.properties.label] || {}
							},
							...(get_node_color_and_type({node: {
								...start_node,
								properties: {
									...start_node.properties,
									...properties[start_node.properties.label || start_node.properties.id] || {},
									...(kind_properties[start_kind] || {})[start_node.properties.label] || {}
								}
							}, terms, record, fields: [field, start_field, end_field], aggr_scores,
								...colors_func(start_type), ...misc_props}))
						} 
					})
					path.push({ 
						data: {
							source: start_node.properties.id,
							target: end_node.properties.id,
							kind: "Relation",
							relation: relation_type,
							label: relation_type,
							properties: {
								id: `${start_node.properties.label}_${relation_type}_${end_node.properties.label}`,
								label: relation_type,
								source_label: start_node.properties.label,
								target_label: end_node.properties.label,
								...properties[`${start_node.properties.label}_${end_node.properties.label}`] || {},
								...process_properties(relation.properties),
							},
							...(get_edge_color({relation, record, aggr_scores, ...colors[relation_type]})),
							directed: relation.properties.directed ? 'triangle': 'none'
						} 
					})
					path.push({ 
						data: {
							id: end_node.properties.id,
							kind: end_kind,
							label: end_node.properties.label || end_node.properties.id,
							properties: {
								...process_properties(end_node.properties),
								...properties[end_node.properties.label || end_node.properties.id] || {},
								...(kind_properties[end_kind] || {})[end_node.properties.label] || {}
							},
							...(get_node_color_and_type({node: {
								...end_node,
								properties: {
									...end_node.properties,
									...properties[end_node.properties.label || end_node.properties.id] || {},
									...(kind_properties[end_kind] || {})[end_node.properties.label] || {}
								}
							}, terms, record, aggr_scores, fields: [field, start_field, end_field],
								...colors_func(end_type), ...misc_props}))
						} 
					})
				}
			} else if (misc_props.augment) {
				for (const node of Object.values(nodes)) {
					const node_type = node.labels.filter(i=>i!=="id")[0]
					const node_kind = kind_mapper ? kind_mapper({node: node, type: node_type, ...misc_props})  : node_type
					path.push({ 
						data: {
							id: node.properties.id,
							kind: node_kind,
							label: node.properties.label || node.properties.id,
							properties: {
								...process_properties(node.properties),
								...properties[node.properties.label || node.properties.id] || {},
								...(kind_properties[node_kind] || {})[node.properties.label] || {}
							},
							...(get_node_color_and_type({node: {
								...node,
								properties: {
									...node.properties,
									...properties[node.properties.label || node.properties.id] || {},
									...(kind_properties[node_kind] || {})[node.properties.label] || {},
								}
							}, terms, record, fields: [field, start_field, end_field], aggr_scores,
								...colors_func(node_type), ...misc_props}))
						} 
					})
				}
			} 
			return path
		  })
		return res
	}

const resolve_two_terms = async ({session, start_term, start_field, start, end_term, end_field, end, limit, order, path_length=4, schema, relation, aggr_scores, colors, remove, expand: e, gene_links}) => {
	if (!parseInt(path_length)) throw {message: "Path length is not a number"}
	let query = `MATCH q=allShortestPaths((a: \`${start}\` {${start_field}: $start_term})-[*..${path_length}]-(b: \`${end}\` {${end_field}: $end_term}))
		USING INDEX a:\`${start}\`(${start_field})
		USING INDEX b:\`${end}\`(${end_field})
	`		
	const edges = schema.edges.reduce((acc, i)=>([
		...acc,
		...i.match
	  ]), [])
	if (relation) {
		const rels = []
		for (const i of relation.split(",")) {
			if (edges.indexOf(i) === -1) throw {message: `Invalid relationship ${i}`}
			rels.push(`\`${i}\``)
		}
		if (rels.length > 0) query = query.replace(`[*..${path_length}]`,`[:${rels.join("|")}*..${path_length}]`)
	}
	const vars = {}
	if ((remove || []).length) {
		query = query + `
			WHERE NOT a.id in ${JSON.stringify(remove)}
			AND NOT b.id in ${JSON.stringify(remove)}
		`
	} 
	const gl = []
	if (gene_links) {
		const links = JSON.parse(gene_links)
		for (const i of links) {
			if (edges.indexOf(i) === -1) throw {message: `Invalid relationship ${i}`}
			gl.push(`\`${i}\``)
		}
		query = query + `CALL {
			WITH q
			MATCH p=(c:Gene)-[:${gl.join("|")}]-(d:Gene)
			WHERE c in NODES(q) and d in NODES(q)
			RETURN p, nodes(p) as n, relationships(p) as r
			UNION
			WITH q
			RETURN q as p, nodes(q) as n, relationships(q) as r
		}
		RETURN p, n, r
		LIMIT TOINTEGER($limit) `
	}
	else {
		query = query + `RETURN q as p, nodes(q) as n, relationships(q) as r LIMIT TOINTEGER($limit)`
	}
	// remove has precedence on expand
	const expand = (e || []).filter(i=>(remove || []).indexOf(i) === -1)

	if ((expand || []).length) {
		for (const ind in expand) {
			vars[`expand_${ind}`] = expand[ind]
			query = query + `
				UNION
				MATCH p = (c)--(d)
				WHERE c.id = $expand_${ind}
				RETURN p, nodes(p) as n, relationships(p) as r
				LIMIT 10
			`   
		}
	}
	const results = await session.readTransaction(txc => txc.run(query, { start_term, end_term, limit, ...vars }))
	return resolve_results({results, terms: [start_term, end_term], schema, order, score_fields,  aggr_scores, colors, start_field, end_field})
}

const resolve_term_and_end_type = async ({session, start_term, start_field, start, end, limit, order, path_length=4, schema, relation, aggr_scores, colors, remove, expand: e, gene_links}) => {
	
	if (!parseInt(path_length)) throw {message: "Path length is not a number"}
	let query = `MATCH q=allShortestPaths((a: \`${start}\` {${start_field}: $start_term})-[*..${path_length}]-(b: \`${end}\`))
		USING INDEX a:\`${start}\`(${start_field})
	`

	const edges = schema.edges.reduce((acc, i)=>([
		...acc,
		...i.match
	  ]), [])
	if (relation) {
		const rels = []
		for (const i of relation.split(",")) {
			if (edges.indexOf(i) === -1) throw {message: `Invalid relationship ${i}`}
			rels.push(`\`${i}\``)
		}
		if (rels.length > 0) query = query.replace(`[*..${path_length}]`,`[:${rels.join("|")}*..${path_length}]`)
	}
	const vars = {}
	if ((remove || []).length) {
		query = query + `
			WHERE NOT a.id in ${JSON.stringify(remove)}
			AND NOT b.id in ${JSON.stringify(remove)}
		`
	} 
	if (start === end) {
		if (query.includes('WHERE')) {
			query = query + `
				AND NOT b.label = $start_term
			`
		} else {
			query = query + `
				WHERE NOT b.label = $start_term
			`
		}
	}
	const gl = []
	if (gene_links) {
		const links = JSON.parse(gene_links)
		for (const i of links) {
			if (edges.indexOf(i) === -1) throw {message: `Invalid relationship ${i}`}
			gl.push(`\`${i}\``)
		}
		query = query + `CALL {
			WITH q
			MATCH p=(c:Gene)-[:${gl.join("|")}]-(d:Gene)
			WHERE c in NODES(q) and d in NODES(q)
			RETURN p, nodes(p) as n, relationships(p) as r
			UNION
			WITH q
			RETURN q as p, nodes(q) as n, relationships(q) as r
		}
		RETURN p, n, r
		LIMIT TOINTEGER($limit) `
	}
	else {
		query = query + `RETURN q as p, nodes(q) as n, relationships(q) as r LIMIT TOINTEGER($limit)`
	}
	// remove has precedence on expand
	const expand = (e || []).filter(i=>(remove || []).indexOf(i) === -1)

	if ((expand || []).length) {
		for (const ind in expand) {
			vars[`expand_${ind}`] = expand[ind]
			query = query + `
				UNION
				MATCH p = (c)--(d)
				WHERE c.id = $expand_${ind}
				RETURN p, nodes(p) as n, relationships(p) as r
				LIMIT 10
			`   
		}
	}

	
	// if (score_fields.length) query = query + `, ${score_fields.join(", ")}`
	// query = `${query} RETURN * ORDER BY rand() LIMIT ${limit}`
	const results = await session.readTransaction(txc => txc.run(query, { start_term, limit, ...vars }))
	return resolve_results({results, terms: [start_term], schema, order, score_fields,  aggr_scores, colors, start_field})
}


const resolve_one_term = async ({session, start, field, term, relation, limit, order, path_length=1, schema, aggr_scores, colors, expand: e, remove, gene_links, augment, augment_limit=10}) => {
	if (!parseInt(path_length)) throw {message: "Path length is not a number"}
	let query = `
		MATCH q=(st:\`${start}\` { ${field}: $term })-[*${path_length}]-(en)
		USING INDEX st:\`${start}\`(${field})
		WITH q, st
		LIMIT TOINTEGER($limit) 
		`
		const edges = schema.edges.reduce((acc, i)=>([
			...acc,
			...i.match
		  ]), [])
		const rels = []
		if (relation) {
			for (const i of relation.split(",")) {
				if (edges.indexOf(i) === -1) throw {message: `Invalid relationship ${i}`}
				rels.push(`\`${i}\``)
			}
			if (rels.length > 0) query = query.replace(`[*${path_length}]`,`[:${rels.join("|")}*..${path_length}]`)
		}
		const vars = {}
		if ((remove || []).length) {
			query = query + `
				WHERE NOT a.id in ${JSON.stringify(remove)}
				AND NOT b.id in ${JSON.stringify(remove)}
			`
		} 
		const gl = []
		if (gene_links) {
			const links = JSON.parse(gene_links)
			for (const i of links) {
				if (edges.indexOf(i) === -1) throw {message: `Invalid relationship ${i}`}
				gl.push(`\`${i}\``)
			}
			if (start === "Gene") {

			}
			if (start === "Gene") {
				query = query + `CALL {
					WITH q, st
					MATCH p=(c:Gene)-[:${gl.join("|")}]-(d:Gene)
					WHERE c in NODES(q)
					RETURN p, nodes(p) as n, relationships(p) as r
					UNION
					WITH q
					RETURN q as p, nodes(q) as n, relationships(q) as r
				}
				RETURN p, n, r`
			} else {
				query = query + `CALL {
					WITH q, st
					MATCH p=(c:Gene)-[:${gl.join("|")}]-(d:Gene)-[${rels.length ? ":" + rels.join("|"): ""}]-(st)
					WHERE c in NODES(q)
					RETURN p, nodes(p) as n, relationships(p) as r
					UNION
					WITH q
					RETURN q as p, nodes(q) as n, relationships(q) as r
				}
				RETURN p, n, r`
			}
			
		}
		else {
			query = query + `RETURN q as p, nodes(q) as n, relationships(q) as r LIMIT TOINTEGER($limit)`
		}
	// remove has precedence on expand
	const expand = (e || []).filter(i=>(remove || []).indexOf(i) === -1)
	if ((expand || []).length) {
		for (const ind in expand) {
			vars[`expand_${ind}`] = expand[ind]
			query = query + `
				UNION
				MATCH p = (c)--(d)
				WHERE c.id = $expand_${ind}
				RETURN p, nodes(p) as n, relationships(p) as r
				LIMIT 10
			`   
		}
	}
	const results = await session.readTransaction(txc => txc.run(query, { term, limit, ...vars }))
	if (!augment) return resolve_results({results, terms: [term], schema, order, score_fields,  aggr_scores, colors, field})
	else {
		const initial_results = resolve_results({results, terms: [term], schema, order, score_fields,  aggr_scores, colors, field})
		const gene_list = []
		let gene_nodes = []
		let start_node
		for (const i of initial_results) {
			if (i.data.properties[field] === term && i.data.kind === start) {
				start_node = i
			}
			if (i.data.kind === "Gene") {
				const gene = i.data.label
				if (gene_list.indexOf(gene) === -1) {
					gene_list.push(gene)
					gene_nodes.push(i)
				}
			}
		}
		const { augmented_genes } = await augment_gene_set({gene_list, augment_limit})
		let query
		if (gene_links) {
			query = `
				MATCH p=(a: Gene)-[:${gl.join("|")}]-(b: Gene)
				WHERE a.label IN ${JSON.stringify(augmented_genes)} AND b.label IN ${JSON.stringify(augmented_genes)}
				RETURN p, nodes(p) as n, relationships(p) as r
			`
		} else {
			query = `
				MATCH p=(a: Gene)
				WHERE a.label IN ${JSON.stringify(augmented_genes)}
				RETURN p, nodes(p) as n, relationships(p) as r
			`
		}	
		const augmented_nodes = await session.readTransaction(txc => txc.run(query, { term, limit, ...vars }))
		const augmented_results = resolve_results({results: augmented_nodes, terms: [term], schema, order, score_fields,  aggr_scores, get_node_color_and_type, colors, field, kind_mapper, misc_props: {augmented_genes, augment, gene_list}})
		const augmented_edges = []
		for (const i of augmented_results) {
			if (i.data.kind !== "Relation") {
				augmented_edges.push({
					"data": {
					"source": start_node.data.id,
					"target": i.data.id,
					"kind": "Relation",
					"relation": "Augmented Co-expression Gene",
					"label": "Augmented Co-expression Gene",
					"properties": {
						"id": `${start_node.data.id}-${i.data.id}`,
						"label": "Augmented Co-expression Gene",
						"source_label": start_node.data.label,
						"target_label": i.data.label,
					},
					"lineColor": "#81c784",
					"directed": "none"
					}
				})
			}
			// for (const node of gene_nodes){
			// 	if (i.data.kind !== "Relation") {
			// 		augmented_edges.push({
			// 			"data": {
			// 			"source": node.data.id,
			// 			"target": i.data.id,
			// 			"kind": "Relation",
			// 			"relation": "Augmented Co-expression Gene",
			// 			"label": "Augmented Co-expression Gene",
			// 			"properties": {
			// 				"id": `${node.data.id}-${i.data.id}`,
			// 				"label": "Augmented Co-expression Gene",
			// 				"source_label": node.data.label,
			// 				"target_label": i.data.label,
			// 			},
			// 			"lineColor": "#81c784",
			// 			"directed": "none"
			// 			}
			// 		})
			// 	}
			// }
		}
		return [...initial_results, ...augmented_results, ...augmented_edges]

	}
}

export default async function query(req, res) {
  const { start, start_field="label", start_term, end, end_field="label", end_term, relation, limit=25, path_length, order, remove, expand, gene_links, augment, augment_limit } = await req.query
  const schema = await (await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/schema`)).json()
  const {aggr_scores, colors} = await (await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/aggregate`)).json()
  const nodes = schema.nodes.map(i=>i.node)
  if (nodes.indexOf(start) < 0) res.status(400).send("Invalid start node")
  else if (end && nodes.indexOf(end) < 0) res.status(400).send("Invalid end node")
  else { 
  	try {
		const session = neo4jDriver.session({
			defaultAccessMode: neo4j.session.READ
		})
		try {
			if (start && end && start_term && end_term) {
				if(augment)  res.status(400).send("You can only augment on single search")
				const results = await resolve_two_terms({session, start_term, start_field, start, end_term, end_field, end, relation, limit, path_length, schema, order, aggr_scores, colors, remove: remove ?  JSON.parse(remove): [], expand: expand ? JSON.parse(expand) : [], gene_links})
				fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/counter/update`)
				res.status(200).send(results)
			} else if (start && end && start_term ) {
				if(augment)  res.status(400).send("You can only augment on single search")
				const results = await resolve_term_and_end_type({session, start_term, start_field, start, end, relation, limit, path_length, schema, order, aggr_scores, colors, remove: remove ?  JSON.parse(remove): [], expand: expand ? JSON.parse(expand) : [], gene_links})
				fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/counter/update`)
				res.status(200).send(results)
			} else if (start) {
				const results = await resolve_one_term({session, start, field: start_field, term: start_term, relation, limit, path_length, schema, order, aggr_scores, colors, remove: remove ?  JSON.parse(remove): [], expand: expand ? JSON.parse(expand) : [], gene_links, augment, augment_limit })
				fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/counter/update`)
				res.status(200).send(results)
			} else {
				res.status(400).send("Invalid input")
			}
		  } catch (e) {
			console.log(e.message)
			res.status(400).send(e.message)
		  } finally {
			session.close()
		  }
		} catch (e) {
			res.status(400).send(e.message)
		}
	}
}

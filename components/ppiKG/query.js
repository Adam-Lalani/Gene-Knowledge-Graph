export default async function getQ({processed, subG, hops, bg, hight, st, iidb, ot, pd, bp, cI, C1, C2}) {

    try{
        const url = `${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/ppi_kg`
        const response = await fetch(url, {
        method: 'POST', // Change to the appropriate HTTP method (GET, POST, etc.)
        headers: {
            'Content-Type': 'application/json', // Set the appropriate content type
        },
        body: JSON.stringify({ 
          geneset: processed, 
          subgraph_size: subG,
          path_length: hops,
          biogrid: bg,
          ht: hight,
          string: st,
          iid: iidb,
          ortho: ot, 
          pred: pd,
          bioplex: bp,
          ci: cI,
          c1: C1,
          c2: C2,
        })
      });
   
      const data = await response.json();
      console.log(data)
      return data;

    } catch (error) {
        console.error(error);
    }
}

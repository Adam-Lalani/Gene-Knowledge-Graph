export default async function getQ({processed}) {

    try{
        const url = `${process.env.NEXT_PUBLIC_HOST}/G2Ntest/api/knowledge_graph/ppi_kg`
        const response = await fetch(url, {
        method: 'POST', // Change to the appropriate HTTP method (GET, POST, etc.)
        headers: {
            'Content-Type': 'application/json', // Set the appropriate content type
        },
        body: JSON.stringify({ 
          geneset: processed 
        })
      });
      const data = await response.json();
      console.log(data)
      return data[0];

    } catch (error) {
        console.error(error);
    }
}

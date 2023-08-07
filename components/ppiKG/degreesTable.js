import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { precise } from "../../utils/helper";
const Grid = dynamic(() => import('@mui/material/Grid'));
const Card = dynamic(() => import('@mui/material/Card'));
const CardContent = dynamic(() => import('@mui/material/CardContent'));

const DataGrid = dynamic(async () => (await import('@mui/x-data-grid')).DataGrid);
const GridToolbar = dynamic(async () => (await import('@mui/x-data-grid')).GridToolbar);
import Tabs from '@mui/material/Tabs';
const Tab = dynamic(() => import('@mui/material/Tab'));
import Box from "@mui/material/Box";

const header1 = [
    {
        field: 'id',
        headerName: "Interaction ID",
        flex: 1,
     //   style: {flexDirection: "row"},
        align: "left"
    },
    {
        headerName: "source",
       field: "source", 
    },
    {
        headerName: "target",
        field: "target",
        
    },
    {
        headerName: "source label",
        field: "source_label",
    },
    {
        headerName: "target label",
        field: "target_label",
    },
    {
        headerName: "Source Database",
        field: "source_database",
    },
    {
        headerName: "Interaction Confidence",
        field: "interaction_confidence",
    },
    {
        headerName: "Experimental System",
        field: "experimental_system",
    },
    {
        headerName: "evidence type",
        field: "evidence_type",
    },
    {
        headerName: "Throughput",
        field: "throughput",
    },
    {
        headerName: "pmids",
        field: "pmids",
    }
]




const header2 = [
    {
        field: 'id',
        headerName: "Gene/Protein ID",
        flex: 1,
     //   style: {flexDirection: "row"},
        align: "left"
    },
	{
        field: 'label',
        headerName: "Label",
        flex: 1,
     //   style: {flexDirection: "row"},
        align: "left"
    },
    {
        field: 'zscore',
        headerName: "Z-Score",
        align: "left"
    },
    {
        field: 'degree',
        headerName: "Degree",
        align: "left"
    },
    {
        field: 'seed',
        headerName: "Seed",
        align: "left"
    },
    {
        field: 'total_degree',
        headerName: "Degree in Background",
        align: "left"
    },
]



const DegreeTable = ({data}) => {
	const [entries1, setEntries1] = useState(null)
    const [entries2, setEntries2] = useState(null)
    const [tab, setTab] = useState(0);
    const handleTabChange = (event, newTabIndex) => {
      setTab(newTabIndex);
    };


	useEffect(()=>{
		if (data) {
			const nodes = {}
            const edges ={}


			for (const dt of data) {
                if (dt['data']['kind'] === 'Relation'){
                    const start = dt.data.source
                    const end = dt.data.target
                    const db = dt.data.source_database
                    const props = dt.data.properties
                    edges[dt.data.properties.id] = {
                        id: props.id,
                        source: start,
                        target: end,
                        source_label: props.source_label,
                        target_label: props.target_label,
                        source_database: db,
                        interaction_confidence: props.interaction_confidence || "",
                        experimental_system: props.experimental_system || "",
                        evidence_type: props.evidence_type || "",
                        throughput: props.throughput || "",
                        pmids: props.pmids || "",
                    }

                } else if (dt["data"]["kind"] === 'Protein'){
                    const id2 = dt.data.id
                    const label2 = dt.data.label
                    const degrees = dt.data.degree
                    const seedV = dt.data.seed
                    const zscore = dt.data.zscore
                    const td = dt.data.total_degree
                    nodes[id2] = {
                        id: id2,
                        label : label2,
                        degree: parseInt(degrees),
                        seed: seedV,
                        zscore: parseFloat(zscore),
                        total_degree: parseInt(td)
                    }
                } // set entries 
            }
            setEntries1(Object.values(edges))
            console.log(entries1)
            setEntries2(Object.values(nodes).sort((a,b)=>a.degree-b.degree))
            console.log(entries2)
        }}, [data])
	
		return (
           
            <Card style={{marginBottom: 10}}> 
            <CardContent>
            <Tabs value={tab} onChange={handleTabChange}>
            <Tab label="Nodes" />
            <Tab label="Edges" />
            </Tabs>
            <Box sx={{ padding: 2 }}>
            {tab === 1 && (
                <Grid item xs={12}>
                    <DataGrid
                        initialState={{
                            columns: {
                                columnVisibilityModel: {
                                    id: false,
                          },
                        },
                      }}
                        components={{ Toolbar: GridToolbar }}
                        sortingOrder={['desc', 'asc']}
                        rows={entries1}
                        columns={header1}
                        autoPageSize
                        disableColumnMenu
                        autoHeight
                        pageSize={10}
                        rowsPerPageOptions={[5, 10, 25]}
                    />
                </Grid>
             )}
             {tab === 0 && (
                <Box>
               <Grid item xs={12}>
                    <DataGrid
                        components={{ Toolbar: GridToolbar }}
                        sortingOrder={['desc', 'asc']}
                        rows={entries2}
                        columns={header2}
                        autoPageSize
                        disableColumnMenu
                        autoHeight
                        pageSize={10}
                        rowsPerPageOptions={[5, 10, 25]}
                    />
                </Grid>
                </Box> 
             )}
            </Box>
            </CardContent>
            </Card>
		)
	}


export default DegreeTable
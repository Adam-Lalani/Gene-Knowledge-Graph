import React, { useState, useRef, useEffect,createRef, Component } from 'react';
import dynamic from 'next/dynamic'
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import getQ from './query'
import Slider from '@mui/material/Slider'
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { process_tables } from '../../utils/helper';
import SaveIcon from '@mui/icons-material/Save';
import Tooltip from '@mui/material/Tooltip';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import { toPng, toBlob, toSvg } from 'html-to-image';
import download from 'downloadjs'
import fileDownload from 'js-file-download'
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress  from '@mui/material/CircularProgress';
import HubIcon from '@mui/icons-material/Hub';
import Icon from '@mui/icons-material/Hub';
import Link from '@mui/material/Link';
import PaletteIcon from '@mui/icons-material/Palette';
import Avatar from '@mui/material/Avatar'; 
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';

const NetworkTable =  dynamic(() => import('../network_table'))

const DegreeTable = dynamic(() => import('./degreesTable'))


const headingStyle = {
  color: '#3f51b5',
  //fontFamily: 'Roboto',
  fontWeight: 'bold',
};

const bodStyle = {
  color: '#545d6b',
  //'#3b609c',
  //fontFamily: 'Roboto',
  fontWeight: 'bold',
};

const degreeMap = new Map()


const Cytoscape = dynamic(() => import('../Cytoscape'), { ssr: false })


// needed for kg 
export const layouts = {
  "Force-directed": {
    name: 'fcose',
    quality: 'proof',
    randomize: 'false',
    animate: true,
    idealEdgeLength: edge => 150,
    icon: ()=><HubIcon/>
  },
  "Hierarchical Layout": {
    name: "breadthfirst",
    animate: true,
    spacingFactor: 1,
    padding: 15,
    avoidOverlap: true,
    icon: ()=><Icon path={mdiFamilyTree} size={0.8} />
  },
  "Geometric": {
    name: 'avsdf',
    nodeSeparation: 150,
    icon: ()=><Icon path={mdiDotsCircle} size={0.8} />
  },
}

export default function TextBox(){
  // node colors 
  const [color1, setColor1] = useState("#aff0ca")
  const [color2, setColor2] = useState('#ade7ff')
  const [colormenu, setColormenu] = React.useState(null);
  const colormenuOpen = Boolean(colormenu);

  const handleColor1 = (event) => {
    setColor1(event.target.value); 
  };
  const handleColor2 = (event) => {
    setColor2(event.target.value); 
  };

  const resetColor  = (event) => {
    setColor1("#aff0ca"); 
    setColor2('#ade7ff'); 
  };

  // table view
  const [table, setTable] = React.useState(null);
  const tableOpen = Boolean(table);
  const tableref = useRef(null);

  // cytoscape components 
  const cyref = useRef(null);
  const [id, setId] = useState(0)
  const [node, setNode] = React.useState(null) 
  const [edge, setEdge] = React.useState(null)
  const [focused, setFocused] = React.useState(null)

  const [text, setText] = useState(''); // State to store the text input value

  const [genes, setGenes] = useState(''); // State to store the genes

  const [path, setPath] = useState(2); // State to store the hop length 

  const [size, setSize] = useState(25); // State to store the subgraph size 

  // edits layout
  const [layout, setLayout] = useState(Object.keys(layouts)[0])  
  

// layout menu 
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);


  const handleCloseLayout = (val) => {
    setLoading(true)
    setLayout(val)
    setId(id+1)
    setLoading(false)
    setAnchorEl(null);
  };

  // use for all menues
  const handleClickMenu = (e, setter) => {
		setter(e.currentTarget);
	  };
  const handleCloseMenu = (setter) => {
      setter(null);
    };


  //save subgraph menu 
  const [anchorEl1, setAnchorEl1] = React.useState(null);
  const open1 = Boolean(anchorEl1);

  // menu for edge filtering
  const [anchorEl2, setAnchorEl2] = React.useState(null);
  const open2 = Boolean(anchorEl2);

  // tabs for edge filtering 
  const [tab, setTab] =  React.useState(0);
  const handleTabChange = (event, newTabIndex) => {
    setTab(newTabIndex);
  };

  // tab buttons 

  // bioGrid Button 
  const [biogrid, setBiogrid] = useState(true);

  const handleBG = () => {
    setBiogrid(!biogrid);
  };

  //htbuttons
  const [ht, setHT] = useState(true);

  const handleHT = () => {
    setHT(!ht);
  };

  //string buttons
  const [stringdb, setStringdb] = useState(true);

  const handleString = () => {
    setStringdb(!stringdb);
  };

  //iid buttons 
  const [iid, setIID] = useState(true);

  const handleIID = () => {
    setIID(!iid);
  };
  const [ortho, setOrtho] = useState(true);

  const handleOrtho = () => {
    setOrtho(!ortho);
  };
  const [pred, setPred] = useState(true);

  const handlePred = () => {
    setPred(!pred);
  };

  //bioplex 
  const [bioplex, setBioPlex] = useState(true);

  const handleBioplex = () => {
    setBioPlex(!bioplex);
  };
const [ci, setCI] = useState(0); // State to store the CI for bioplex
const processCI  = (event, newVal) => {
  setCI(newVal);
}


  const handleTextChange = (event) => {
    setText(event.target.value); // Update the text state with the new input value
  };

  const [loading, setLoading] = useState(false);

  const processText = async () => {
    const processed = text.toUpperCase().split(/[\s,]+/)
    console.log(processed)
    setLoading(true);
    const data = await getQ({processed:processed, subG: size, hops: path, bg:biogrid, hight:ht, st:stringdb, iidb:iid, ot:ortho, pd: pred, cI:ci, bp:bioplex, C1: color1, C2: color2});
    setLoading(false)
    setGenes(data);
    setLayout(Object.keys(layouts)[0])
    setId(id+1)
    console.log(degreeMap)
};

const processExample = async () => {
  setText("NSUN3 \nPOLRMT \nNLRX1 \nSFXN5 \nZC3H12C \nNDUFB6 \nLPAR6")

}



  const processPath  = (event, newVal) => {
    setPath(newVal);
  }

  const processSubg  = (event, newVal) => {
    setSize(newVal);
  }

  const processLayout = (event,newVal) => {
    setLayout(newVal)
  }





  return (
    <div> 
      <h1 style={headingStyle}>Genes4Networks: Protein-Protein Interaction Knowledge Graph Server</h1>
      <p style={bodStyle}> Genes4Networks (G4N) is a tool made for biologist that connects enriched genes/proteins with know protein-protein interactions (PPI) from selected databases to form a subnetwork. G4N relies on a shortest-path algorithm from neo4j, a graph database. Enter a list of mammalian genes or proteins in Entrez gene symbol format to receive results of a PPI subnetwork.</p>

    <Grid style={{paddingBottom: 10}} alignItems="center" justifyContent={"space-between"} sx={{width:'100%'}}>
   
    <Grid  
     item 
    > 

    <Grid container spacing={2} columnSpacing={2}> 

    <Grid item xs = {7}  sm = {6} md = {6} xl = {6} lg ={6}> 


    <Stack spacing = {2}>
    <TextField
      label= "Enter Gene List"
      id="outlined-basic"
      size = {'medium'}
      fullWidth
      multiline
      rows={10}
      value={text}
      onChange={handleTextChange}
    />
    <Stack direction='row' justifyContent="space-between">
    <Button variant="contained" onClick={processText} size="large">
      Generate Subnetwork
    </Button> 

    <Button variant="text" onClick={processExample} size="large">
      Try an example!
    </Button> 

    </Stack>


    </Stack>
    </Grid>

    <Grid item xs = {7}  sm = {6} md = {6} xl = {6} lg ={6}> 
    <Stack spacing = {1.885}>
    <Typography gutterBottom>Nodes between Seed Genes</Typography>
    <Slider    
      value = {path}
      onChange={processPath} 

      defaultValue={2}
      valueLabelDisplay="auto"

      step={1}
      marks
      min={0}
      max={2}
    />
    <Typography gutterBottom>Number of Nodes in Subnetwork</Typography>
    <Slider    
      value = {size}
      onChange={processSubg}

      defaultValue={30}
      valueLabelDisplay="auto"

      step={1}
      marks
      min={0}
      max={200}
    />
    <Button
        variant="contained"
        id="basic-button"
        aria-controls={open2 ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open2 ? 'true' : undefined}
        onClick={(e)=>handleClickMenu(e, setAnchorEl2)}
      >
        Filter Database and Interactions 
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl2}
        open={open2}
        onClose={()=>handleCloseMenu(setAnchorEl2)}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <CardContent style={{width: 560}}>
        <Tabs value={tab} onChange={handleTabChange}>
        <Tab label="BioGRID" />
        <Tab label="BioPlex" />
        <Tab label="IID" />
        <Tab label="STRING" />
        </Tabs>
        <Box sx={{ padding: 2 }}>

        {tab === 0 && (
        <Box>
            <Checkbox
               checked={biogrid}
               onChange={handleBG}
               color="primary"
               inputProps={{ 'aria-label': 'primary checkbox' }}
              />
          <label htmlFor="checkbox">Include <Link href="https://thebiogrid.org/" target="_blank" rel="noopener noreferrer">BioGRID</Link></label>
          <Box></Box>
             <Checkbox
               checked={ht}
               onChange={handleHT}
               color="primary"
               inputProps={{ 'aria-label': 'primary checkbox' }}
               disabled = {!biogrid}
              />  
          <label htmlFor="checkbox">Include High Throughput Interactions</label>
          </Box> 
           
        )}

        {tab === 1 && (
          <Box>
          <Checkbox
             checked={bioplex}
             onChange={handleBioplex}
             color="primary"
             inputProps={{ 'aria-label': 'primary checkbox' }}
            />
        <label htmlFor="checkbox">Include <Link href="https://bioplex.hms.harvard.edu/" target="_blank" rel="noopener noreferrer">BioPlex</Link></label>
        <Typography gutterBottom>Interaction Confidence Interval</Typography>
        <Slider    
          value = {ci}
          onChange={processCI}

          defaultValue={0}
          valueLabelDisplay="auto"
          disabled = {!bioplex}
          step={.01}
          marks
          min={0}
          max={1}
        />
           
        </Box> 
        )}

        {tab === 2 && (
           <Box>
           <Checkbox
              checked={iid}
              onChange={handleIID}
              color="primary"
              inputProps={{ 'aria-label': 'primary checkbox' }}
             />
         <label htmlFor="checkbox">Include <Link href="http://iid.ophid.utoronto.ca/" target="_blank" rel="noopener noreferrer">IID</Link></label>
         <Box></Box>
            <Checkbox
              checked={pred}
              onChange={handlePred}
              color="primary"
              inputProps={{ 'aria-label': 'primary checkbox' }}
              disabled = {!iid}
             />  
         <label htmlFor="checkbox">Include Machine Learning Predicted Interactions</label>
         <Box></Box>

          <Checkbox
          checked={ortho}
          onChange={handleOrtho}
          color="primary"
          inputProps={{ 'aria-label': 'primary checkbox' }}
          disabled = {!iid}
          />  
          <label htmlFor="checkbox">Include Orthologous Interactions</label>
          </Box> 
        )}

        {tab === 3 && (
          <Box>
            <Checkbox
               checked={stringdb}
               onChange={handleString}
               color="primary"
               inputProps={{ 'aria-label': 'primary checkbox' }}
              />
          <label htmlFor="checkbox">Include <Link href="https://string-db.org/" target="_blank" rel="noopener noreferrer">STRING</Link></label>
          </Box>
        )}
        
      </Box>
  
        </CardContent>
        
      </Menu> 
    <Button
        variant="contained"
        id="basic-button"
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={(e)=>handleClickMenu(e, setAnchorEl)}
      >
        Graph Layout Options
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseLayout}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <MenuItem onClick={() =>handleCloseLayout(Object.keys(layouts)[0])}>Directed</MenuItem>
        <MenuItem onClick={() => handleCloseLayout(Object.keys(layouts)[1])}>Hierarchical</MenuItem>
        <MenuItem onClick={() => handleCloseLayout(Object.keys(layouts)[2])}>Geometric</MenuItem>
      </Menu>
      
      </Stack> 

      </Grid>

      </Grid>

      </Grid>   



    <Grid item
      style={{
      border: "none",
      backgroundColor: "#fff"
      }}>
         <Box sx={{
          width: 15,
          height: 15,}}></Box>
        {(typeof genes === 'string') ? (
          <Box>
          </Box>
        ) : 
        
        // make into icon buttons - download a csv, download a png of the graph 
        <Grid item > 
         <Backdrop
                    sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                    open={loading}
                >
                    <CircularProgress/>
                </Backdrop> 
        <Stack spacing = {2}>
          <Stack direction = "row" spacing = {2}> 
          <Tooltip title={"Save subnetwork"}>
          <IconButton
          onClick={()=>{
            if (genes) process_tables(genes)
          }}
          >
            <SaveIcon/>
          </IconButton>
          </Tooltip>

          <Tooltip title={"Download graph as an image file"}>
                <IconButton 
                    onClick={(e)=>handleClickMenu(e, setAnchorEl1)}
                    aria-controls={anchorEl1!==null ? 'basic-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={anchorEl1!==null ? 'true' : undefined}
                ><CameraAltOutlinedIcon/></IconButton>
          </Tooltip>
               <Menu
                  id="basic-menu"
                  anchorEl={anchorEl1}
                  open={open1}
                  onClose={()=>handleCloseMenu(setAnchorEl1)}
                  MenuListProps={{
                      'aria-labelledby': 'basic-button',
                  }}
              >
                  <MenuItem key={'png'} onClick={()=> {
                      handleCloseMenu(setAnchorEl1)
                      // fileDownload(cyref.current.png({output: "blob"}), "network.png")
                      toPng(document.getElementById('kg-network'))
                      .then(function (fileUrl) {
                          download(fileUrl, "network.png");
                      });
                  }}>PNG</MenuItem>
                  <MenuItem key={'jpg'} onClick={()=> {
                      handleCloseMenu(setAnchorEl1)
                      // fileDownload(cyref.current.jpg({output: "blob"}), "network.jpg")
                      toBlob(document.getElementById('kg-network'))
                      .then(function (blob) {
                          fileDownload(blob, "network.jpg");
                      });
                  }}>JPG</MenuItem>
                  <MenuItem key={'svg'} onClick={()=> {
                      handleCloseMenu(setAnchorEl1)
                      // fileDownload(cyref.current.svg({output: "blob"}), "network.svg")
                      toSvg(document.getElementById('kg-network'))
                      .then(function (dataUrl) {
                          download(dataUrl, "network.svg")
                      });
                  }}>SVG</MenuItem>
                </Menu> 
                <Tooltip title={"Table View"}>
                <IconButton
                 onClick={(e)=>handleClickMenu(e, setTable)}
                 aria-controls={table!==null ? 'basic-menu' : undefined}
                 aria-haspopup="true"
                 aria-expanded={table!==null ? 'true' : undefined}
              >
                <TableRowsOutlinedIcon/>
                </IconButton>
                </Tooltip>
                <Menu
                  id="basic-menu"
                  anchorEl={table}
                  open={tableOpen}
                  onClose={()=>handleCloseMenu(setTable)}
                  MenuListProps={{
                      'aria-labelledby': 'basic-button',
                  }}
              >
              <CardContent  style={{width: 900}}>
                <Grid item xs={12} sx={{minHeight: 700}}>
               <div ref={tableref} >
                <DegreeTable data={genes}/>
              </div>
              </Grid>
              </CardContent>
              </Menu>

                <Tooltip title={"Edit Colors"}>
                <IconButton
                 onClick={(e)=>handleClickMenu(e, setColormenu)}
                 aria-controls={colormenu!==null ? 'basic-menu' : undefined}
                 aria-haspopup="true"
                 aria-expanded={colormenu!==null ? 'true' : undefined}
              >
                <PaletteIcon/>
                </IconButton>
                </Tooltip>
                <Menu
                  id="basic-menu"
                  anchorEl={colormenu}
                  open={colormenuOpen}
                  onClose={()=>handleCloseMenu(setColormenu)}
                  MenuListProps={{
                      'aria-labelledby': 'basic-button',
                  }}
              > 
               <CardContent  style={{width: 200}}>
                <Stack spacing={2}>
               <TextField
                label= "Change Color 1"
                id="outlined-basic"
                size = {'small'}
                fullWidth
                value={color1}
                onChange={handleColor1}
              />
              <TextField
                label= "Change Color 2"
                id="outlined-basic"
                size = {'small'}
                fullWidth
                value={color2}
                onChange={handleColor2}
              />

              <Button
                variant="contained"
                id="basic-button"
                onClick={resetColor}
              >
              Reset Colors 
              </Button>
                
              </Stack>
              </CardContent>
              </Menu> 
             
            <Stack>
            <Grid container alignItems={"center"} spacing={1}>
            <Grid item><Avatar sx={{background: color1}}> </Avatar></Grid>
            <Grid item><Typography variant="subtitle1">Seed Gene Node</Typography></Grid>   
            </Grid>
            </Stack>
            <Stack>
            <Grid container alignItems={"center"} spacing={1}>
            <Grid item><Avatar sx={{background: color2}}> </Avatar></Grid>
            <Grid item><Typography variant="subtitle1">Intermediate Gene Node</Typography></Grid>   
            </Grid>
            </Stack>
             

          </Stack>
          <Cytoscape
            id="kg-network"
            key={id}
            wheelSensitivity={0.1}
            style={{
              width: '100%',
              height: 700,
            }}
            stylesheet={[
              {
                selector: 'node',
                style: {
                  'background-color': 'data(color)',
                  'border-color': 'data(borderColor)',
                  'border-width': 'data(borderWidth)',
                  'label': 'data(label)',
                  'font-size': '22px',
                  "text-valign": "center",
                  "text-halign": "center",
                  'width':  '110', 
                  //function(ele){ return Math.max(1, Math.ceil(ele.degree()/2)) * 10; },
                  //function(ele){ return ele.degree(); },
                  //'110',
                  'height': '110'
                  //function(ele){degreeMap.set('label',ele.degree()); return '110'} 
                  //function(ele){ return Math.max(1, Math.ceil(ele.degree()/2)) * 10; },
                  //function(ele){ return ele.degree(); },
                  //'110'
                  //'width': `mapData(node_type, 0, 1, 70, 150)`,
                 // 'height': `mapData(node_type, 0, 1, 70, 150)`,
                }
              },
              {
                selector: 'edge',
                style: {
                  'curve-style': 'straight',
                  // 'opacity': '0.5',
                  'line-color': 'data(lineColor)',
                  'width': '3',
                  'label': 'data(source_database)',
                  "text-rotation": "autorotate",
                  "text-margin-x": "0px",
                  "text-margin-y": "0px",
                  'font-size': '16px',
                  'target-arrow-shape': `data(directed)`,
                  'target-endpoint': 'outside-to-node',
                  'source-endpoint': 'outside-to-node',
                  'target-arrow-color': 'data(lineColor)',
                }
              },
              {
                selector: 'node.highlight',
                style: {
                    'border-color': 'gray',
                    'border-width': '2px',
                    'font-weight': 'bold',
                    'font-size': '18px',
                    'width': '100',
                    'height': '100'
                    //'width': `mapData(node_type, 0, 1, 90, 170)`,
                    //'height': `mapData(node_type, 0, 1, 90, 170)`,
                }
              },
              {
                selector: 'node.focused',
                style: {
                    'border-color': 'gray',
                    'border-width': '2px',
                    'font-weight': 'bold',
                    'font-size': '18px',
                    'width': '100',
                    'height': '100'
                   // 'width': `mapData(node_type, 0, 1, 90, 170)`,
                   // 'height': `mapData(node_type, 0, 1, 90, 170)`,
                }
              },
              {
                selector: 'edge.focusedColored',
                style: {
                    'line-color': '#F8333C',
                    'width': '6'
                }
              },
              {
                selector: 'node.semitransp',
                style:{ 'opacity': '0.5' }
              },
              {
                selector: 'node.focusedSemitransp',
                style:{ 'opacity': '0.5' }
              },
              {
                selector: 'edge.colored',
                style: {
                    'line-color': '#F8333C',
                    'target-arrow-color': '#F8333C',
                    'width': '6'
                }
              },
              {
                selector: 'edge.semitransp',
                style:{ 'opacity': '0.5' }
              },
              {
                selector: 'edge.focusedSemitransp',
                style:{ 'opacity': '0.5' }
              }
            ]}
            elements={genes}
            layout={layouts[layout]}
            cy={(cy) => {
              cyref.current = cy
              cy.on('click', 'node', function (evt) {
              // setAnchorEl(null)
              const node = evt.target.data()

              if (focused && node.id === focused.id) {
                  const sel = evt.target;
                  cy.elements().removeClass('focusedSemitransp');
                  sel.removeClass('focused').outgoers().removeClass('focusedColored')
                  sel.incomers().removeClass('focusedColored')
                  setFocused(null)
              } else{
                  const sel = evt.target;
                  cy.elements().removeClass('focused');
                  cy.elements().removeClass('focusedSemitransp');
                  cy.elements().removeClass('focusedColored');
                  cy.elements().not(sel).addClass('focusedSemitransp');
                  sel.addClass('focused').outgoers().addClass('focusedColored')
                  sel.incomers().addClass('focusedColored')
                  sel.incomers().removeClass('focusedSemitransp')
                  sel.outgoers().removeClass('focusedSemitransp')
                  setEdge(null)
                  setNode(null)
                  setFocused(node)
                  setTimeout(()=>{
                      const sel = evt.target;
                      cy.elements().removeClass('focusedSemitransp');
                      sel.removeClass('focused').outgoers().removeClass('focusedColored')
                      sel.incomers().removeClass('focusedColored')
                      setFocused(null)
                  }, 3000)
              }
                })

                cy.nodes().on('mouseover', (evt) => {
                    const n = evt.target.data()
                    const sel = evt.target;
                    cy.elements().not(sel).addClass('semitransp');
                    sel.addClass('highlight').outgoers().addClass('colored')
                    sel.incomers().addClass('colored')
                    sel.incomers().removeClass('semitransp')
                    sel.outgoers().removeClass('semitransp')
                    if (focused === null && n.id !== (node || {}).id) {
                        setEdge(null)
                        setNode(n)
                    }
                });

                cy.nodes().on('mouseout', (evt) => {
                    const sel = evt.target;
                    cy.elements().removeClass('semitransp');
                    sel.removeClass('highlight').outgoers().removeClass('colored')
                    sel.incomers().removeClass('colored')
                    // setAnchorEl(null)
                    // setNode({node: null})
                    setNode(null)
                });
                cy.edges().on('mouseover', (evt) => {
                    const e = evt.target.data()
                    const sel = evt.target;
                    cy.elements().not(sel).addClass('semitransp');
                    sel.addClass('colored').connectedNodes().addClass('highlight')
                    sel.connectedNodes().removeClass('semitransp')
                    if (focused === null && e.id !== (edge || {}).id) {
                        // setAnchorEl(evt.target.popperRef())
                        // setNode({node: n})
                        setNode(null)
                        setEdge(e)
                    }
                });
                cy.edges().on('mouseout', (evt) => {
                    const sel = evt.target;
                    cy.elements().removeClass('semitransp');
                    sel.removeClass('colored').connectedNodes().removeClass('highlight')
                    // setAnchorEl(null)
                    // setNode({node: null})
                    setEdge(null)
                });
            }}
          /> </Stack></Grid> 
          }
      </Grid>
      </Grid>
      </div>
);
};

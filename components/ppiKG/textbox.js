import React, { useState, useEffect, Component } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import getQ from './query'
import Slider from '@mui/material/Slider'
import Box from '@mui/material/Box';
import CytoscapeComponent from "react-cytoscapejs";

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
    const [text, setText] = useState(''); // State to store the text input value

    const [genes, setGenes] = useState(''); // State to store the genes

    const [path, setPath] = useState(2); // State to store the hop length 

    const [size, setSize] = useState(25); // State to store the subgraph size 

    const [layout, setLayout] = useState(Object.keys(layouts)[0])




    const handleTextChange = (event) => {
      setText(event.target.value); // Update the text state with the new input value
    };

    const processText = async () => {
      const processed = text.toUpperCase().split(" ")
      const data = await getQ({processed:processed});
      setGenes(data);
  };
  


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
      <Box sx={{ width:300 }}>
      <TextField
        label="Enter Text"
        value={text}
        onChange={handleTextChange}
        fullWidth
      />
      </Box>

      <Box sx={{ width:300 }}>
      <p>Nodes between Proteins</p>
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
      <p>Subgraph Size</p>
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
      </Box>
      <Button variant="contained" onClick={processText}>
        Process
      </Button>  
      <div
        style={{
        border: "1px solid",
        backgroundColor: "#f5f6fe"
        }}>
         {(typeof genes === 'string') ? (
            <div>No results</div>
          ) :
            <CytoscapeComponent
              key={'id'}
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
                    "text-valign": "center",
                    "text-halign": "center",
                    'width': `mapData(node_type, 0, 1, 70, 150)`,
                    'height': `mapData(node_type, 0, 1, 70, 150)`,
                  }
                },
                {
                  selector: 'edge',
                  style: {
                    'curve-style': 'straight',
                    // 'opacity': '0.5',
                    'line-color': 'data(lineColor)',
                    'width': '3',
                    // 'label': 'data(label)',
                    "text-rotation": "autorotate",
                    "text-margin-x": "0px",
                    "text-margin-y": "0px",
                    'font-size': '12px',
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
                      'width': `mapData(node_type, 0, 1, 90, 170)`,
                      'height': `mapData(node_type, 0, 1, 90, 170)`,
                  }
                },
                {
                  selector: 'node.focused',
                  style: {
                      'border-color': 'gray',
                      'border-width': '2px',
                      'font-weight': 'bold',
                      'font-size': '18px',
                      'width': `mapData(node_type, 0, 1, 90, 170)`,
                      'height': `mapData(node_type, 0, 1, 90, 170)`,
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
            />
            }
        </div>

    </div>
  );
};



